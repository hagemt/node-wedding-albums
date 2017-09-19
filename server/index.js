/* eslint-env es6, node */
const HTTP = require('http')

const Application = require('koa')
const helmet = require('koa-helmet')
const serve = require('koa-static')

const { getLogger } = require('./providers.js')
const { FavoritesRouter } = require('./routers.js')

const PUBLIC_FOLDER = require('path').resolve(__dirname, '..', 'public')

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
	application.use(helmet())
	const routers = [
		new FavoritesRouter(),
	]
	for (const router of routers) {
		application.use(router.allowedMethods())
		application.use(router.routes())
	}
	application.use(serve(PUBLIC_FOLDER))
	const server = HTTP.createServer()
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
	const port = process.env.PORT || 8000
	const service = createService()
	startService(service, port)
		.then(() => {
			service.log.info({ port }, 'started')
			for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
				process.once(signal, () => {
					service.log.warn({ signal }, 'will terminate')
					process.exit()
				})
			}
		})
		.catch((error) => {
			service.log.fatal(error, 'failed to start')
			process.exit(1)
		})
}
