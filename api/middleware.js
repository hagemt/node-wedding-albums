/* eslint-env node */
const koaOmnibus = require('koa-omnibus')
const KoaRouter = require('koa-router')

const Logging = require('./logging.js')
const Storage = require('./storage.js')
const RedisRouter = require('./RedisRouter.js')

const createApplication = () => {
	const childLogger = (context, fields) => {
		return Logging.getLogger().child(fields)
	}
	return koaOmnibus.createApplication({
		namespace: false, // use state
		stateLogger: childLogger,
	})
}

class RedisStatusRouter extends KoaRouter {

	constructor ({ prefix }) {
		super({ prefix })
		const getStatus = async ({ response }) => {
			response.body = await this.getStatus()
		}
		this.get('/', getStatus)
		this.get('/status', getStatus)
		this.redis = Storage.getClient()
	}

	async getStatus () {
		const now = new Date()
		return Object.freeze({
			lastUpdated: now.toISOString(),
			redisStatus: this.redis.status,
		})
	}

}

const createRouter = (resource, prefix = '/api/v1') => {
	if (resource === 'status') { // special case:
		const router = new RedisStatusRouter({ prefix })
		return Object.freeze(router)
	}
	const router = new RedisRouter({
		keyOne: id => `image:${id}:${resource}`,
		keyTwo: ip => `person:${ip}:${resource}`,
		prefixRoutes: `${prefix}/${resource}`,
	})
	return Object.freeze(router)
}

module.exports = {
	createApplication,
	createRouter,
}
