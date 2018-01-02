/* eslint-env node */
const child = require('child_process')
const path = require('path')
const stream = require('stream')

const Bunyan = require('bunyan')
const _ = require('lodash')

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug'
const LOG_NAME = process.env.LOG_NAME || 'album'

const DEFAULT_LOG_ROOT = path.resolve(__dirname, '..', 'logs') // folder
const DEFAULT_LOG_PATH = path.resolve(DEFAULT_LOG_ROOT, `${LOG_NAME}.log`)
const LOG_PATH = process.env.LOG_PATH || DEFAULT_LOG_PATH // not folder

const LOG_BUNYAN = path.resolve(__dirname, '..', 'node_modules', '.bin', 'bunyan')
const bunyanProcess = options => child.spawn(LOG_BUNYAN, process.execArgv, options)

// FIXME: this hack adds two active handles
// eslint-disable-next-line no-unused-vars
const bunyanStream = _.once(() => {
	const bunyan = bunyanProcess({
		stdio: ['pipe', process.stdout, process.stderr],
	})
	// can/should use Transform instead?
	const writer = new (stream.Writable)({
		write: (...args) => {
			return bunyan.stdin.write(...args)
		},
	})
	process.once('beforeExit', () => {
		// need to flush here?
		child.kill()
	})
	return writer
})

const getLogger = _.once(() => {
	// by default, 
	const logSerializers = Object.assign({}, Bunyan.stdSerializers)
	const logStreamInMemory = new Bunyan.RingBuffer({ limit: 1024 })
	const logStreams = []
	// for heap dumps:
	logStreams.push({
		stream: logStreamInMemory,
		type: 'raw',
	})
	// no rotation:
	logStreams.push({
		path: LOG_PATH,
		type: 'file',
	})
	// for dev TTY:
	logStreams.push({
		stream: process.stdout,
	})
	const rootLogger = Bunyan.createLogger({
		level: LOG_LEVEL,
		name: LOG_NAME,
		serializers: logSerializers,
		streams: logStreams,
	})
	rootLogger.on('error', (error) => {
		// eslint-disable-next-line no-console
		console.error(error, 'from root logger')
	})
	return rootLogger.child({
		component: 'api',
	})
})

module.exports = {
	getLogger,
}
