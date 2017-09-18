/* eslint-env es6, node */
const KoaRouter = require('koa-router')
const { zipObject } = require('lodash')

const { getStorage } = require('./providers.js')

// these are probably stupid defaults:
const getImage = ({ id }) => (id || '0')
const getPerson = ({ ip }) => (ip || '0.0.0.0')

const keyImageFavorites = id => `image:${id}:favorites`
const keyPersonFavorites = ip => `person:${ip}:favorites`

const IMAGES = new Set(Array.from({ length: 1170 }, (unused, index) => String(index + 1))) // [1,...n]
const getImages = (...args) => new Set(getImage(...args).split(',').filter(image => IMAGES.has(image)))

const throwErrors = (response) => {
	const results = [] // returned in order
	for (const [reason, result] of response) {
		if (reason) throw new Error(reason)
		else results.push(result)
	}
	return results
}

const getFavoriteCounts = async (storage, images) => {
	const commands = []
	for (const image of images) {
		commands.push(['scard', keyImageFavorites(image)])
	}
	return throwErrors(await storage.multi(commands).exec())
}

const getFavoriteImages = async (storage, people) => {
	const commands = []
	for (const person of people) {
		commands.push(['smembers', keyPersonFavorites(person)])
	}
	return throwErrors(await storage.multi(commands).exec())
}

const markFavoriteImages = async (storage, state, person, images) => {
	const commands = [] // to n + 1 sets:
	const command = state ? 'sadd' : 'srem'
	commands.push([command, keyPersonFavorites(person), ...images])
	for (const image of images) {
		commands.push([command, keyImageFavorites(image), person])
	}
	return throwErrors(await storage.multi(commands).exec())
}

class FavoritesRouter extends KoaRouter {

	constructor () {
		super({ prefix: '/favorites' })
		this.get('/', async ({ query, state, request, response }, next) => {
			const images = getImages(query) // whitelist'd on IMAGES
			const person = state.person = getPerson(request) // IP
			response.body = {
				all: await this.getFavoriteCounts(...images),
				yours: await this.getFavoriteImages(person),
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
			await markFavoriteImages(this.storage, true, person, images)
			response.status = 200
			await next()
		})
		this.delete('/', async ({ query, state, request, response }, next) => {
			const images = getImages(query) // whitelist'd on IMAGES
			const person = state.person = getPerson(request) // IP
			await markFavoriteImages(this.storage, false, person, images)
			response.status = 200
			await next()
		})
		this.storage = getStorage()
		Object.freeze(this)
	}

	async getImages () {
		return Array.from(IMAGES)
	}

	async getUsers () {
		const images = await this.getImages() // union all sets:
		return this.storage.sunion(images.map(keyImageFavorites))
	}

	async getFavoriteCounts (...images) {
		if (images.length === 0) {
			const all = await this.getImages()
			return this.getFavoriteCounts(...all)
		}
		return getFavoriteCounts(this.storage, images)
			.then(numbers => zipObject(images, numbers))
	}

	async getFavoriteImages (...people) {
		if (people.length === 0) {
			const all = await this.getUsers()
			return this.getFavoriteImages(...all)
		}
		return getFavoriteImages(this.storage, people)
			.then(arrays => zipObject(people, arrays))
	}

}

module.exports = {
	FavoritesRouter,
}
