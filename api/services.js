/* eslint-env node */
const fs = require('fs')
const http = require('http')
const https = require('https')
const os = require('os')
const path = require('path')
const tls = require('tls')
const url = require('url')

const httpShutdown = require('http-shutdown')
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
	try {
		const isDirectory = fs.statSync(SERVED_FOLDER).isDirectory()
		if (isDirectory) application.use(koaStatic(SERVED_FOLDER))
		else throw new Error(`not directory: ${SERVED_FOLDER}`)
	} catch (error) {
		log.warn({ err: error }, `will fallback to ${PUBLIC_FOLDER}`)
		application.use(koaStatic(PUBLIC_FOLDER, { defer: true }))
	}
}

const setupServer = (application, log) => {
	// if SSL is truthy, then use HTTPS (current default: HTTP)
	// N.B. SSL support in project is currently experimental
	// should just support/default to HTTPv2, instead?
	const createServer = (factory, options) => {
		const server = factory.createServer(options)
		server.on('request', application.callback())
		return httpShutdown(server) // more graceful
	}
	try {
		const SSL = JSON.parse(process.env.SSL || 'false') // default to 'true' (eventually)
		if (!SSL) return createServer(http) // querystring.parse(SSL) for "advanced" options?
		const PRIVATE_FOLDER = path.resolve(PROJECT_ROOT, 'private') // "advanced" options:
		const SSL_CERTIFICATES_PEM = path.resolve(PRIVATE_FOLDER, 'ssl-certificates.pem')
		const SSL_PRIVATE_KEY_PEM = path.resolve(PRIVATE_FOLDER, 'ssl-private-key.pem')
		let context // currently requires client supporting SNI:
		const options = {
			SNICallback: (servername, callback) => {
				callback(null, context)
			},
		}
		const setupTLS = () => {
			const paths = {
				certificates: SSL_CERTIFICATES_PEM,
				key: SSL_PRIVATE_KEY_PEM,
			}
			context = tls.createSecureContext({
				cert: fs.readFileSync(paths.certificates),
				key: fs.readFileSync(paths.key),
			})
			log.info({ paths }, 'new SSL context')
		}
		setupTLS() // to refresh certificates daily:
		//setInterval(setupTLS, 1000 * 60 * 60 * 24)
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
			component: 'service',
		})
	setupStatic(application, log) // serve files
	const server = setupServer(application, log)
	return Object.freeze({ log, server })
}

/* istanbul ignore next */
const startService = ({ log, server }, { backlog, hostname, port }) => {
	// https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback
	return new Promise((resolve, reject) => {
		const isHTTP = (server instanceof http.Server) // hack
		const portNumber = Number(port) || (isHTTP ? 80 : 443)
		const statusURL = url.format({
			hostname: hostname || os.hostname(),
			pathname: '/api/v1/status', // try GET
			port: Number(port), // or, default to:
			protocol: isHTTP ? 'http:' : 'https:',
		})
		server.on('error', (error) => {
			if (!server.listening) reject(error)
			else log.warn({ err: error }, 'server')
		})
		server.once('listening', () => {
			log.info({ url: statusURL }, 'listening')
			resolve(server)
		})
		server.listen(portNumber, hostname, backlog)
	})
}

/* istanbul ignore next */
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
