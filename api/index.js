/* eslint-env node */
const cluster = require('cluster')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')

const Application = require('koa')
const koaHelmet = require('koa-helmet')
const koaCORS = require('kcors')
const koaGZIP = require('koa-compress')
const koaStatic = require('koa-static')

const Logging = require('./logging.js')
const middleware = require('./middleware.js')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_FOLDER = path.resolve(PROJECT_ROOT, 'public')
const SERVED_FOLDER = path.resolve(PROJECT_ROOT, 'served')

const createService = () => {
	const log = Logging.getLogger()
		.child({
			component: 'api',
		})
	const application = new Application()
	application.use(middleware.trackRequests(log))
	application.use(koaCORS())
	application.use(koaGZIP())
	application.use(koaHelmet())
	const routers = []
	/* istanbul ignore next */
	switch (process.env.NODE_ENV) {
	case 'load':
	case 'test':
		routers.push(middleware.createRouter('favorites'))
		break
	case 'development':
	case 'production':
	default:
		routers.push(middleware.createRouter('laughs'))
		routers.push(middleware.createRouter('loves'))
	}
	for (const router of routers) {
		application.use(router.allowedMethods())
		application.use(router.routes())
	}
	/* istanbul ignore next */
	try {
		const isDirectory = fs.statSync(SERVED_FOLDER).isDirectory()
		if (isDirectory) application.use(koaStatic(SERVED_FOLDER))
		else throw new Error(`!S_ISDIR(${SERVED_FOLDER})`)
	} catch (e) {
		log.warn(e, `will fallback to ${PUBLIC_FOLDER}`)
		application.use(koaStatic(PUBLIC_FOLDER))
	}
	// TODO: use https for PWA and SW
	const server = http.createServer()
	/* istanbul ignore next */
	server.on('error', (error) => {
		log.warn(error, 'internal failure')
	})
	server.on('request', application.callback())
	return Object.freeze({ log, server })
}

/* istanbul ignore next */
const startService = ({ server }, ...args) => {
	return new Promise((resolve, reject) => {
		server.listen(...args, (listenError) => {
			if (listenError) reject(listenError)
			else resolve(server)
		})
	})
}

module.exports = {
	createService,
	startService,
}

/* istanbul ignore next */
if (!module.parent) {
	const bind = process.env.BIND || null
	const port = process.env.PORT || 9000
	const service = createService() // has log
	const fatal = ['SIGHUP', 'SIGINT', 'SIGTERM']
	process.on('unhandledRejection', (reason) => {
		service.log.warn(reason, 'unhandled rejection')
	})
	const startOne = () => startService(service, { host: bind, port })
		.then(() => {
			service.log.info({ address: bind || 'any', port }, 'started')
		})
		.catch((error) => {
			service.log.fatal(error, 'failed to start')
			process.exit(1)
		})
	const startAll = () => {
		if (!cluster.isMaster) {
			startOne() // then, how to terminate gracefully?
		} else {
			// NPROC workers each start service (server) once
			const nproc = process.env.NPROC || os.cpus().length
			for (let i = 0; i < nproc; i += 1) cluster.fork()
		}
	}
	/* istanbul ignore next */
	switch (process.env.NODE_ENV) {
	case 'load':
	case 'production':
		startAll()
		break
	case 'development':
	case 'test':
	default:
		startOne()
			.then(() => {
				for (const signal of fatal) {
					process.once(signal, () => {
						service.log.warn({ signal }, 'will terminate')
						process.kill(process.pid, signal)
					})
				}
			})
	}
}
