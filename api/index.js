/* eslint-env node */
const cluster = require('cluster')
const fs = require('fs')
const http = require('http')
const https = require('https')
const os = require('os')
const path = require('path')
const tls = require('tls')

const koaCORS = require('@koa/cors')
const koaGZIP = require('koa-compress')
const koaHelmet = require('koa-helmet')
const koaStatic = require('koa-static')

const Logging = require('./logging.js')
const middleware = require('./middleware.js')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PUBLIC_FOLDER = path.resolve(PROJECT_ROOT, 'public')
const SERVED_FOLDER = path.resolve(PROJECT_ROOT, 'served')

const setupStatic = (application, log) => {
	/* istanbul ignore next */
	try {
		const isDirectory = fs.statSync(SERVED_FOLDER).isDirectory()
		if (isDirectory) application.use(koaStatic(SERVED_FOLDER))
		else throw new Error(`not directory: ${SERVED_FOLDER}`)
	} catch (e) {
		log.warn(e, `will fallback to ${PUBLIC_FOLDER}`)
		application.use(koaStatic(PUBLIC_FOLDER))
	}
}

const setupServer = (application, log) => {
	// if SSL=truthy, then use HTTPS (current default: HTTP)
	// N.B. SSL support in project is currently experimental
	// TODO: should just start with support for HTTPv2, instead?
	const createServer = (factory, options) => {
		const server = factory.createServer(options)
		server.on('request', application.callback())
		return require('http-shutdown')(server)
	}
	try {
		const SSL = JSON.parse(process.env.SSL || 'false') // eventually: defualt to 'true'
		if (!SSL) return createServer(http) // TODO: parse with querystring for advanced options?
		const SSL_CERTIFICATES_PEM = path.resolve(PROJECT_ROOT, 'private', 'ssl-certificates.pem')
		const SSL_PRIVATE_KEY_PEM = path.resolve(PROJECT_ROOT, 'private', 'ssl-private-key.pem')
		let context // currently requires client supporting SNI
		const options = {
			SNICallback: (servername, callback) => {
				callback(null, context)
			},
		}
		const setupTLS = () => {
			context = tls.createSecureContext({
				cert: fs.readFileSync(SSL_CERTIFICATES_PEM),
				key: fs.readFileSync(SSL_PRIVATE_KEY_PEM),
			})
		}
		setupTLS() // to refresh every day: setInterval(setupTLS, 1000 * 60 * 60 * 24)
		//log.info({ certificates: SSL_CERTIFICATES_PEM, key: SSL_PRIVATE_KEY_PEM }, 'SSL')
		return createServer(https, options)
	} catch (error) {
		log.warn(error, `SSL=${process.env.SSL} setup failure`)
		return createServer(http) // is this fall-back unsafe?
	}
}

const createService = () => {
	const application = middleware.createApplication()
	application.use(koaCORS()) // for cross-origin requests
	application.use(koaGZIP()) // for stream compression
	application.use(koaHelmet()) // for security headers
	const routers = [middleware.createRouter('status')]
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
	const log = Logging.getLogger() // parent
		.child({
			component: 'api',
		})
	setupStatic(application, log) // serve files
	const server = setupServer(application, log)
	return Object.freeze({ log, server })
}

/* istanbul ignore next */
const startService = ({ log, server }, { backlog, hostname, port }) => {
	return new Promise((resolve, reject) => {
		server.on('error', (error) => {
			if (!server.listening) reject(error)
			else log.warn(error, 'internal failure')
		})
		server.once('listening', () => {
			const url = `${hostname || 'localhost'}:${port}`
			log.info({ url }, 'listening')
			resolve(server)
		})
		server.listen(port, hostname, backlog)
	})
}

const stopService = ({ server }, { timeout }) => {
	return new Promise((resolve, reject) => {
		server.shutdown(resolve) // as graceful as possible
		const message = `shutdown hit ${timeout}ms timeout`
		setTimeout(reject, timeout, new Error(message))
	})
}

module.exports = {
	createService,
	startService,
	stopService,
}

/* istanbul ignore next */
if (!module.parent) {
	const bind = process.env.BIND || null
	const port = process.env.PORT || 9000
	const startWorker = () => {
		const service = createService()
		return startService(service, { hostname: bind, port })
			.then(() => {
				process.on('unhandledRejection', (reason) => {
					service.log.warn(reason, 'unhandled rejection')
				})
				for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
					const die = () => process.kill(process.pid, signal)
					process.once(signal, () => {
						service.log.warn({ signal }, 'will terminate after 2s')
						stopService(service, { timeout: 2000 }).then(die, die)
					})
				}
			})
			.catch((error) => {
				service.log.fatal(error, 'failed to start')
				process.exit(1)
			})
	}
	/* istanbul ignore next */
	switch (process.env.NODE_ENV) {
	case 'load':
	case 'production':
		if (!cluster.isMaster) {
			startWorker() // TODO: listen for IPC messages?
		} else {
			// NPROC workers each start service (server) once
			const nproc = process.env.NPROC || os.cpus().length
			for (let i = 0; i < nproc; i += 1) cluster.fork()
		}
		break
	case 'development':
	case 'test':
	default:
		startWorker()
	}
}
