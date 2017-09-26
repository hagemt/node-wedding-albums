/* eslint-env es6, node */
const KoaRouter = require('koa-router')
const _ = require('lodash')

const { getStorage } = require('./providers.js')

// these are probably stupid defaults:
const getImage = ({ id }) => (id || '0')
const getPerson = ({ ip }) => (ip || '0.0.0.0')

const IMAGES = new Set(Array.from({ length: 1170 }, (unused, index) => String(index + 1))) // [1,...n]
const getImages = (...args) => new Set(getImage(...args).split(',').filter(image => IMAGES.has(image)))

const sortedNumbers = string => Array.from(string, Number).sort((left, right) => (left - right))
const filterNumbers = set => all => sortedNumbers(all.filter(one => set.size === 0 || set.has(one)))

const exec = async (multi) => {
	const results = [], response = await multi.exec()
	for (const [reason, result] of response) {
		if (reason) throw new Error(reason)
		else results.push(result)
	}
	return results
}

const createRouter = (resource = 'favorites', ...args) => {

	const keyImage = id => `image:${id}:${resource}`
	const keyPerson = ip => `person:${ip}:${resource}`

	const DEFAULTS = Object.freeze({ prefix: `/${resource}` })

	class ResourceRouter extends KoaRouter {

		constructor ({ prefix } = DEFAULTS) {
			super({ prefix })
			this.get('/', async ({ query, state, request, response }, next) => {
				const images = getImages(query) // whitelist'd on IMAGES
				const person = state.person = getPerson(request) // IP
				const people = await this.getFavoriteImages(person)
				const counts = await this.getFavoriteCounts(...images)
				response.body = {
					images: _.mapValues(counts, string => Number(string)),
					people: _.mapValues(people, filterNumbers(images)),
				}
				await next()
			})
			this.get('/image/:id', async ({ params, response }, next) => {
				const image = getImage(params) // no split (single)
				const counts = await this.getFavoriteCounts(image)
				if (IMAGES.has(image)) response.body = counts[image]
				await next() // else, will response 404 Not Found
			})
			this.get('/person/:ip', async ({ params, state, response }, next) => {
				const person = state.person = getPerson(params) // IP
				const images = await this.getFavoriteImages(person)
				if (person in images) response.body = images[person]
				await next() // else, will response 404 Not Found
			})
			this.post('/', async ({ query, state, request, response }, next) => {
				const images = getImages(query) // whitelist'd on IMAGES
				const person = state.person = getPerson(request) // IP
				const commands = [
					['sadd', keyPerson(person), ...images],
				]
				for (const image of images) {
					commands.push(['sadd', keyImage(image), person])
				}
				await exec(this.storage.multi(commands))
				response.set('Content-Type', 'application/json')
				response.status = 200
				await next()
			})
			this.delete('/', async ({ query, state, request, response }, next) => {
				const images = getImages(query) // whitelist'd on IMAGES
				const person = state.person = getPerson(request) // IP
				const commands = [
					['srem', keyPerson(person), ...images],
				]
				for (const image of images) {
					commands.push(['srem', keyImage(image), person])
				}
				await exec(this.storage.multi(commands))
				response.set('Content-Type', 'application/json')
				response.status = 200
				await next()
			})
			Object.freeze(Object.assign(this, { storage: getStorage() }))
		}

		async getImages () {
			return Array.from(IMAGES)
		}

		async getUsers () {
			const images = await this.getImages() // union:
			return this.storage.sunion(images.map(keyImage))
		}

		async getFavoriteCounts (...images) {
			if (images.length === 0) {
				const all = await this.getImages()
				return this.getFavoriteCounts(...all)
			}
			const commands = []
			for (const image of images) {
				commands.push(['scard', keyImage(image)])
			}
			const counts = await exec(this.storage.multi(commands))
			return _.zipObject(images, counts)
		}

		async getFavoriteImages (...people) {
			if (people.length === 0) {
				const all = await this.getUsers()
				return this.getFavoriteImages(...all)
			}
			const commands = []
			for (const person of people) {
				commands.push(['smembers', keyPerson(person)])
			}
			const images = await exec(this.storage.multi(commands))
			return _.zipObject(people, images)
		}

	}

	return new ResourceRouter(...args)

}

module.exports = {
	createRouter,
}
