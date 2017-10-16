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
const whitelistSet = (set, array) => array.filter(one => set.size === 0 || set.has(one))
const csvSet = object => new Set(whitelistSet(IMAGES, splitNumbers(idImage(object), ',')))

const exec = async (multi) => {
	const results = [], response = await multi.exec()
	for (const [reason, result] of response) {
		/* istanbul ignore if */
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

class ResourceRouter extends KoaRouter {

	constructor ({ keyImage, keyPerson, prefix }) {
		super({ prefix })
		const redisStorage = Storage.getClient() // from `ioredis`
		Object.assign(this, { keyImage, keyPerson, redisStorage })
		this.delete('/', route(this, 'decrement'))
		this.post('/', route(this, 'increment'))
		this.get('/', route(this, 'list'))
		Object.freeze(this)
	}

	async decrement ({ query, request, response }) {
		const numbers = csvSet(Object(query)) // ⊆ IMAGES
		const ip = String(ipPerson(request)) // person = IP
		const commands = Array.from(numbers, number => ['srem', this.keyImage(number), ip])
		commands.push(['srem', this.keyPerson(ip), ...numbers])
		await exec(this.redisStorage.multi(commands))
		response.status = 200
	}

	async increment ({ query, request, response }) {
		const numbers = csvSet(Object(query)) // ⊆ IMAGES
		const ip = String(ipPerson(request)) // person = IP
		const commands = Array.from(numbers, number => ['sadd', this.keyImage(number), ip])
		commands.push(['sadd', this.keyPerson(ip), ...numbers])
		await exec(this.redisStorage.multi(commands))
		response.status = 200
	}

	async list ({ query, request, response }) {
		const numbers = csvSet(Object(query)) // ⊆ IMAGES
		const ip = String(ipPerson(request)) // person = IP
		const members = await this.getMembers(ip) // current
		const cardinality = await this.getCardinality(...numbers)
		const favorites = _.mapValues(members, array => whitelistSet(numbers, array))
		response.body = { images: cardinality, people: favorites }
	}

	async getCardinality (...images) {
		if (images.length === 0) return this.getCardinality(...IMAGES)
		const commands = images.map(image => ['scard', this.keyImage(image)])
		const results = await exec(this.redisStorage.multi(commands))
		return _.zipObject(images, results)
	}

	async getMembers (...people) {
		const commands = people.map(person => ['smembers', this.keyPerson(person)])
		const results = await exec(this.redisStorage.multi(commands))
		return _.zipObject(people, results)
	}

}

const createRouter = (resource = 'favorites') => {
	const router = new ResourceRouter({
		keyImage: id => `image:${id}:${resource}`,
		keyPerson: ip => `person:${ip}:${resource}`,
		prefix: `/${resource}`,
	})
	return Object.freeze(router)
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

module.exports = {
	createRouter,
	trackRequests,
}
