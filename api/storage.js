/* eslint-env node */
const Redis = require('ioredis')
const _ = require('lodash')

const { getLogger } = require('./logging.js')

// hack to disable more expensive diagnostics:
const TYPE = process.env.NODE_ENV || 'development'
const DEBUG = TYPE === 'development' || TYPE === 'test'

// by default, retry after {2,4,8,16,32}s (~1m total):
const exponentialBackoff = (limit = 5, unit = 1000) => {
	const retryStrategy = (failures) => {
		if (failures <= limit) {
			// wait 2^N seconds after attempt N
			return unit * 2 ** failures
		}
	}
	retryStrategy.max = unit * 2 ** (limit + 1)
	return retryStrategy
}

const getClient = _.once(() => {
	const defaultStrategy = exponentialBackoff()
	// where all options are configured:
	const redis = new Redis({
		enableReadyCheck: true,
		//enableOfflineQueue: false,
		keyPrefix: 'wedding:albums:',
		//reconnectOnError: error => 2,
		// return 0/1/2 (resend commands)
		retryStrategy: defaultStrategy,
		showFriendlyErrorStack: DEBUG,
		// ^ can be rather expensive
	})
	const log = getLogger()
		.child({
			component: 'redis',
		})
	redis.on('close', () => {
		log.warn('connection closed')
	})
	redis.on('connect', () => {
		log.info('connection established')
	})
	redis.on('end', () => {
		log.warn('connection failed')
	})
	redis.on('error', (error) => {
		log.warn(error, 'connection problem')
	})
	redis.on('ready', () => {
		log.info('connection ready')
	})
	redis.on('reconnecting', () => {
		log.info('connection retry')
	})
	if (DEBUG) {
		redis.on('message', (channel, message) => {
			log.debug({ channel }, message)
		})
		redis.monitor((error, connection) => {
			if (error) log.warn(error, 'failed monitor')
			else connection.on('monitor', (time, args, source, database) => {
				log.trace({ command: args, database, source, when: time }, 'event')
			})
		})
	}
	return Object.defineProperties(redis, {
		isReady: {
			value: () => new Promise((resolve, reject) => {
				if (redis.status === 'ready') resolve(redis)
				else {
					const error = new Error('no connection ready within timeout')
					const timeout = setTimeout(reject, defaultStrategy.max, error)
					const readyListener = () => {
						clearTimeout(timeout)
						resolve(redis)
					}
					redis.once('error', () => {
						redis.removeListener('ready', readyListener)
					})
					redis.once('ready', readyListener)
				}
			}),
		},
		log: {
			value: log,
		},
	})
})

module.exports = {
	getClient,
}
