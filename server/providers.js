/* eslint-env es6, node */
const Bunyan = require('bunyan')
const Redis = require('ioredis')
const _ = require('lodash')

const getLogger = _.once(() => {
	const log = new Bunyan({
		level: process.env.LOG_LEVEL || 'trace',
		name: process.env.LOG_NAME || 'album',
		serializers: Bunyan.stdSerializers,
	})
	return log
})

const getStorage = _.once(() => {
	const log = getLogger()
		.child({
			component: 'storage',
		})
	const redis = new Redis()
	redis.on('error', (error) => {
		log.warn(error, 'bad Redis connection')
	})
	redis.monitor((error, connection) => {
		if (error) log.warn(error, 'bad Redis monitor')
		else connection.on('monitor', (time, args, source, database) => {
			log.trace({ command: args, database, source, when: time }, 'event')
		})
	})
	return Object.defineProperties(redis, {
		log: {
			value: log,
		},
	})
})

module.exports = {
	getLogger,
	getStorage,
}
