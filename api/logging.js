/* eslint-env es6, node */
//const Process = require('child_process')
const path = require('path')

const Bunyan = require('bunyan')
const _ = require('lodash')

const LOG_LEVEL = process.env.LOG_LEVEL || 'trace'
const LOG_NAME = process.env.LOG_NAME || 'album'

const DEFAULT_LOG_ROOT = path.resolve(__dirname, '..', 'logs') // folder
const DEFAULT_LOG_PATH = path.resolve(DEFAULT_LOG_ROOT, `${LOG_NAME}.log`)
const LOG_PATH = process.env.LOG_PATH || DEFAULT_LOG_PATH // will rotate logs
//const LOG_PRETTY = path.resolve(__dirname, '..', 'node_modules', '.bin', 'bunyan')

const pipe = (parent = process) => {
	/*
	const child = Process.spawn(LOG_PRETTY)
	process.on('exit', () => child.kill())
	return parent.stdout.pipe(child.stdin)
	*/
	return parent.stdout
}

const getLogger = _.once(() => {
	const logSerializers = {} // for err, req and res:
	Object.assign(logSerializers, Bunyan.stdSerializers)
	const logStreams = []
	logStreams.push({
		stream: new Bunyan.RingBuffer({
			limit: 1024,
		}),
		type: 'raw',
	})
	logStreams.push({
		path: LOG_PATH,
		type: 'rotating-file',
	})
	logStreams.push({
		stream: pipe(),
	})
	return Bunyan.createLogger({
		level: LOG_LEVEL,
		name: LOG_NAME,
		serializers: logSerializers,
		streams: logStreams,
	})
})

module.exports = {
	getLogger,
}
