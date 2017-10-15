/* eslint-env es6, node */
process.env.NODE_ENV = 'test'

const Bunyan = require('bunyan')
const RedisMock = require('ioredis-mock')
const _ = require('lodash')

const Logging = require('./logging.js')
const Storage = require('./storage.js')

const mock = (data = {}) => {
	const client = new RedisMock({ data })
	const logger = Bunyan.createLogger({
		component: 'api',
		level: 'fatal',
		name: 'test',
	})
	const getDefaultLogger = Logging.getLogger
	const getDefaultClient = Storage.getClient
	const undo = () => {
		Logging.getLogger = getDefaultLogger
		Storage.getClient = getDefaultClient
	}
	Logging.getLogger = _.once(() => logger)
	Storage.getClient = _.once(() => client)
	return Object.freeze({ data: client.data, undo })
}

module.exports = mock
