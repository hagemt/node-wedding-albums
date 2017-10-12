/* eslint-env es6, node */
const fs = require('fs')
const path = require('path')
const HTTP = require('http')

const Application = require('koa')
const cors = require('kcors')
const helmet = require('koa-helmet')
const serve = require('koa-static')

const { getLogger } = require('./providers.js')
const { createRouter } = require('./routers.js')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_FOLDER = path.resolve(PROJECT_ROOT, 'public')
const SERVED_FOLDER = path.resolve(PROJECT_ROOT, 'served')

const createService = () => {
	const log = getLogger().child({
		component: 'service',
	})
	const application = new Application()
	application.use(async ({ request, response }, next) => {
		const hrtime = process.hrtime()
		await next() // wait for routers, etc.
		const [s, ns] = process.hrtime(hrtime)
		const ms = (s * 1e3 + ns / 1e6).toFixed(3)
		log.info({ ms, req: request, res: response }, 'handled')
	})
	application.use(cors())
	application.use(helmet())
	const routers = []
	if (process.env.NODE_ENV === 'test') {
		routers.push(createRouter('favorites'))
	} else {
		routers.push(createRouter('laughs'))
		routers.push(createRouter('loves'))
	}
	for (const router of routers) {
		application.use(router.allowedMethods())
		application.use(router.routes())
	}
	try {
		const isDirectory = fs.statSync(SERVED_FOLDER).isDirectory()
		if (isDirectory) application.use(serve(SERVED_FOLDER))
		else throw new Error(`!S_ISDIR(${SERVED_FOLDER})`)
	} catch (e) {
		log.warn(e, `will fallback to ${PUBLIC_FOLDER}`)
		application.use(serve(PUBLIC_FOLDER))
	}
	const server = HTTP.createServer()
	server.on('error', (error) => {
		log.warn(error, 'internal failure')
	})
	server.on('request', application.callback())
	return Object.defineProperties(server, {
		log: {
			value: log,
		},
	})
}

const startService = (server, ...args) => {
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

if (!module.parent) {
	const port = process.env.PORT || 9000
	const service = createService() // has log
	process.on('unhandledRejection', (reason) => {
		service.log.warn(reason, 'unhandled rejection')
	})
	startService(service, port)
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
