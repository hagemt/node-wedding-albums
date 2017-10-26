/* eslint-env node */
const KoaRouter = require('koa-router')
const omnibus = require('koa-omnibus')

const Logging = require('./logging.js')
const RedisRouter = require('./RedisRouter.js')

const createApplication = () => {
	const stateLogger = (context, fields) => Logging.getLogger().child(fields)
	return omnibus.createApplication({ stateLogger }) // nothing else custom?
}

const createStatusRouter = () => {
	const prefix = '/api/v1/status'
	const router = new KoaRouter({ prefix })
	router.get('/', async function status (context) {
		const lastUpdated = new Date().toISOString()
		const serviceState = 'listening' // accurate
		context.body = { lastUpdated, serviceState }
	})
	return Object.freeze(router)
}

const createRouter = (resource) => {
	if (resource === 'status') {
		return createStatusRouter()
	}
	const router = new RedisRouter({
		keyOne: id => `image:${id}:${resource}`,
		keyTwo: ip => `person:${ip}:${resource}`,
		prefixRoutes: `/api/v1/${resource}`,
	})
	return Object.freeze(router)
}

module.exports = {
	createApplication,
	createRouter,
}
