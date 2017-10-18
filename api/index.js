/* eslint-env node */
const fs = require('fs')
const path = require('path')
const HTTP = require('http')

const Application = require('koa')
const cors = require('kcors')
const helmet = require('koa-helmet')
const serve = require('koa-static')

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
	application.use(cors())
	application.use(helmet())
	const routers = []
	/* istanbul ignore else */
	if (process.env.NODE_ENV === 'test') {
		routers.push(middleware.createRouter('favorites'))
	} else {
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
		if (isDirectory) application.use(serve(SERVED_FOLDER))
		else throw new Error(`!S_ISDIR(${SERVED_FOLDER})`)
	} catch (e) {
		log.warn(e, `will fallback to ${PUBLIC_FOLDER}`)
		application.use(serve(PUBLIC_FOLDER))
	}
	const server = HTTP.createServer()
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
	const port = process.env.PORT || 9000
	const service = createService() // has log
	process.on('unhandledRejection', (reason) => {
		service.log.warn(reason, 'unhandled rejection')
	})
	startService(service, { port })
		.then(() => {
			service.log.info({ port }, 'started')
			for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
				process.once(signal, () => {
					service.log.warn({ signal }, 'will terminate')
					process.kill(process.pid, signal)
				})
			}
		})
		.catch((error) => {
			service.log.fatal(error, 'failed to start')
			process.exit(1)
		})
}
