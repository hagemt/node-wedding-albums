/* eslint-env node */
const qs = require('querystring')

const koaCompose = require('koa-compose')
const koaCookie = require('koa-cookie')

const Router = require('koa-router')
const _ = require('lodash')
const UUID = require('uuid')

const Storage = require('./storage.js')

const SESSION_KEY = 'PUBLIC_IP'
// these are probably shit defaults:
const idImage = ({ id }) => id || '0'
const ipPerson = ({ ip }) => ip || '0.0.0.0'

const MAX_AGE = 60 * 60 * 24 * 365 // https://www.youtube.com/watch?v=FOaLc1Wb7ps
const cookieObject = (...args) => Object.assign({}, ...args, { 'Max-Age': MAX_AGE })
const cookieString = (...args) => qs.stringify(cookieObject(...args), '; ') // hack
const IMAGES = new Set(Array.from({ length: 1170 }, (none, index) => index + 1))

// given { id: '2,1,2,3,9001' } (like `params` or `query`) => Set of {2,1,3}
const splitNumbers = (any, token) => Array.from(String(any).split(token), Number)
const filterWithSet = (set, array) => array.filter(one => set.size === 0 || set.has(one))
const csvSet = object => new Set(filterWithSet(IMAGES, splitNumbers(idImage(object), ',')))

const asyncRoute = (object, key) => {
	const method = object[key] // AsyncFunction
	return async function route (context, next) {
		await method.call(object, context, next)
	}
}

const checkResults = (response) => {
	const results = [] // order in, order out
	for (const [reason, result] of response) {
		/* istanbul ignore if */
		if (reason) throw new Error(reason)
		results.push(result) // @Nullable
	}
	return results
}

const sessionCookie = () => {
	const session = async ({ cookie, query, request, response, state }, next) => {
		// TODO: use cookies to ID person, if present?
		const key = String(ipPerson(request)) // e.g. '8.8.8.8'
		const set = csvSet(Object(query)) // e.g. new Set([1170])
		const id = qs.unescape(_.get(cookie, SESSION_KEY, key))
		state.session = Object.assign({ id, set }, state.session)
		state.log.trace({ cookie, session: state.session }, session.name)
		await next()
		response.set('Set-Cookie', cookieString({ [SESSION_KEY]: id }))
	}
	return koaCompose([koaCookie.default(), session])
}

class SimpleRouter extends Router {

	constructor ({ keyImage, keyPerson, prefix }) {
		super({ prefix })
		const redisStorage = Storage.getClient() // from `ioredis`
		Object.assign(this, { keyImage, keyPerson, redisStorage })
		this.use(sessionCookie()) // to setup state.public
		this.delete('/', asyncRoute(this, 'decrement'))
		this.post('/', asyncRoute(this, 'increment'))
		this.get('/', asyncRoute(this, 'list'))
		Object.freeze(this)
	}

	async decrement ({ assert, query, response, state: { session } }) {
		assert(session.set.size > 0, 400, 'missing valid ID(s)', { query, session })
		const commands = Array.from(session.set, id => ['srem', this.keyImage(id), session.id])
		commands.push(['srem', this.keyPerson(session.id), ...session.set])
		checkResults(await this.redisStorage.multi(commands).exec())
		Object.assign(response, { body: 'OK', status: 200 })
	}

	async increment ({ assert, query, response, state: { session } }) {
		assert(session.set.size > 0, 400, 'missing valid ID(s)', { query, session })
		const commands = Array.from(session.set, id => ['sadd', this.keyImage(id), session.id])
		commands.push(['sadd', this.keyPerson(session.id), ...session.set])
		checkResults(await this.redisStorage.multi(commands).exec())
		Object.assign(response, { body: 'OK', status: 200 })
	}

	async list ({ response, state: { session } }) {
		const members = await this.getMembers(session.id) // zipObject'd with session.id
		const cardinality = await this.getCardinality(...session.set) // with session.set
		const favorites = _.mapValues(members, array => filterWithSet(session.set, array))
		response.body = { images: cardinality, people: favorites, _id: session.id }
	}

	async getCardinality (...images) {
		if (images.length === 0) return this.getCardinality(...IMAGES)
		const commands = images.map(image => ['scard', this.keyImage(image)])
		const results = await this.redisStorage.multi(commands).exec()
		return _.zipObject(images, checkResults(results)) // may throw
	}

	async getMembers (...people) {
		const commands = people.map(person => ['smembers', this.keyPerson(person)])
		const results = await this.redisStorage.multi(commands).exec()
		return _.zipObject(people, checkResults(results)) // may throw
	}

}

const createRouter = (resource) => {
	const router = new SimpleRouter({
		keyImage: id => `image:${id}:${resource}`,
		keyPerson: ip => `person:${ip}:${resource}`,
		prefix: `/api/v0/${resource}`,
	})
	return Object.freeze(router)
}

// TODO: use this to contextualize the Error
const stateError = (context, error) => error

// this middleware will be first in the chain, always:
const trackRequests = log => async (context, next) => {
	try {
		const tracking = { request: UUID.v1() }
		context.state.log = log.child({ tracking })
		context.state.start = process.hrtime()
		await next() // defer to routers, etc.
	} catch (error) {
		context.state.error = stateError(context, error)
	} finally {
		const [s, ns] = process.hrtime(context.state.start) // precise to
		const ms = Number(s * 1e3 + ns / 1e6).toFixed(3) // microseconds
		context.response.set('X-Response-Time', `${ms} millisecond(s)`)
		const err = context.state.error // not sure about this pattern
		const [req, res] = [context.request, context.response] // better
		context.state.log.trace({ err, ms, req, res }, 'handled request')
		if (err) context.throw(err.status || 500, err.message, err.public)
	}
}

module.exports = {
	createRouter,
	trackRequests,
	stateError,
}
