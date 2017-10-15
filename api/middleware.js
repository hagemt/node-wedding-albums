/* eslint-env es6, node */
const KoaRouter = require('koa-router')

const _ = require('lodash')
const UUID = require('uuid')

const Storage = require('./storage.js')

const idImage = ({ id }) => id // any String
const ipPerson = ({ ip }) => ip || '0.0.0.0'

const IMAGES = new Set(Array.from({ length: 1170 }, (none, index) => index + 1))

// given { id: '2,1,2,3,9001' } (like `params` or `query`) => Set of {2,1,3}
const splitNumbers = (any, token) => Array.from(String(any).split(token), Number)
const filterNumbers = (all, set) => all.filter(one => set.size === 0 || set.has(one))
const csvSet = object => new Set(filterNumbers(splitNumbers(idImage(object), ','), IMAGES))

const exec = async (multi) => {
	const results = [], response = await multi.exec()
	for (const [reason, result] of response) {
		if (reason) throw new Error(reason)
		else results.push(result)
	}
	return results
}

const route = (object, key) => {
	const method = object[key] // AsyncFunction
	return async function route (context, next) {
		await method.call(object, context)
		await next() // may 404 Not Found
	}
}

const ordering = (counts, filter) => {
	const byCount = (lhs, rhs) => _.get(counts, rhs, 0) - _.get(counts, lhs, 0)
	return array => filterNumbers(Array.from(array, Number), filter).sort(byCount)
}

class ResourceRouter extends KoaRouter {

	constructor ({ keyImage, keyPerson, prefix }) {
		super({ prefix })
		const redisStorage = Storage.getClient() // from `ioredis`
		Object.assign(this, { keyImage, keyPerson, redisStorage })
		/*
		this.get('/image/:id', async ({ params, response }, next) => {
			const image = Number(getImage(Object(params))) || 0
			const counts = await this.getFavoriteCounts(image)
			if (IMAGES.has(image)) response.body = counts[image]
			await next() // else, will response 404 Not Found
		})
		*/
		/*
		this.get('/person/:ip', async ({ params, state, response }, next) => {
			const person = String(getPerson(Object(params))) // IP
			const images = await this.getFavoriteImages(person)
			if (person in images) response.body = images[person]
			await next() // else, will response 404 Not Found
		})
		*/
		// ^ expose these routes for testing?
		this.post('/', route(this, 'add'))
		this.get('/', route(this, 'list'))
		this.delete('/', route(this, 'rm'))
		Object.freeze(this)
	}

	async add ({ query, request, response }) {
		const images = csvSet(Object(query)) // ⊆ IMAGES
		const person = String(ipPerson(request)) // IP
		const commands = Array.from(images, image => ['sadd', this.keyImage(image), person])
		commands.push(['sadd', this.keyPerson(person), ...images])
		await exec(this.redisStorage.multi(commands))
		response.status = 200
	}

	async list ({ query, request, response }) {
		const images = csvSet(Object(query)) // ⊆ IMAGES
		const person = String(ipPerson(request)) // IP
		const members = await this.getMembers(person)
		const numbers = await this.getCardinality(...images)
		response.body = {
			images: numbers, // associates image IDs to # of people
			people: _.mapValues(members, ordering(numbers, images)),
		}
	}

	async rm ({ query, request, response }) {
		const images = csvSet(Object(query)) // ⊆ IMAGES
		const person = String(ipPerson(request)) // IP
		const commands = Array.from(images, image => ['srem', this.keyImage(image), person])
		commands.push(['srem', this.keyPerson(person), ...images])
		await exec(this.redisStorage.multi(commands))
		response.status = 200
	}

	async getImages () {
		return Array.from(IMAGES)
	}

	async getUsers () {
		const images = await this.getImages() // union all:
		return this.redisStorage.sunion(images.map(this.keyImage))
	}

	async getCardinality (...images) {
		if (images.length === 0) {
			const all = await this.getImages()
			return this.getCardinality(...all)
		}
		const commands = images.map(image => ['scard', this.keyImage(image)])
		const results = await exec(this.redisStorage.multi(commands))
		return _.zipObject(images, results)
	}

	async getMembers (...people) {
		if (people.length === 0) {
			const all = await this.getUsers()
			return this.getMembers(...all)
		}
		const commands = people.map(person => ['smembers', this.keyPerson(person)])
		const results = await exec(this.redisStorage.multi(commands))
		return _.zipObject(people, results)
	}

}

const trackRequests = log => async ({ request, response, state }, next) => {
	const tracking = { request: UUID.v1() }
	state.log = log.child({ tracking })
	state.start = process.hrtime()
	await next() // wait for routers, etc.
	const [s, ns] = process.hrtime(state.start)
	const ms = Number(s * 1e3 + ns / 1e6).toFixed(3)
	response.set('X-Response-Time', `${ms} millisecond(s)`)
	state.log.trace({ ms, req: request, res: response }, 'handled')
}

const createRouter = (resource = 'favorites') => {
	const router = new ResourceRouter({
		keyImage: id => `image:${id}:${resource}`,
		keyPerson: ip => `person:${ip}:${resource}`,
		prefix: `/${resource}`,
	})
	return Object.freeze(router)
}

module.exports = {
	createRouter,
	trackRequests,
}
