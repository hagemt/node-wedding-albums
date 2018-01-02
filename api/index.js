/* eslint-env node */
const cluster = require('cluster')
const os = require('os')

const Services = require('./services.js')

module.exports = Services

/* istanbul ignore next */
if (!module.parent) {
	const clamp = (any, min, max) => Math.min(Math.max(any, min), max)
	const port = clamp(process.env.PORT || 8080, 0, 65535) // 0 = any
	const hostname = process.env.BIND || null // null hostname = any
	const backlog = clamp(process.env.BACKLOG || 511, 0, Infinity)
	const timeout = clamp(process.env.TIMEOUT || 2000, 1000, 10000)
	const startService = () => {
		const service = Services.createService() // started immediately:
		return Services.startService(service, { backlog, hostname, port })
			.then(() => {
				process.on('unhandledRejection', (reason) => {
					service.log.warn({ err: reason }, 'unhandled Promise rejection')
				})
				for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM']) {
					const die = () => process.kill(process.pid, signal)
					process.once(signal, () => {
						service.log.warn({ signal }, 'will terminate after 2s')
						Services.stopService(service, { timeout }).then(die, die)
					})
				}
			})
			.catch((error) => {
				service.log.fatal({ err: error }, 'failed to start')
				process.exit(1)
			})
	}
	switch (process.env.NODE_ENV) {
	case 'load':
	case 'production':
		if (!cluster.isMaster) {
			startService() // TODO: listen for IPC messages?
		} else {
			const nproc = Number(process.env.NPROC) || os.cpus().length
			for (let i = 0; i < nproc; i += 1) cluster.fork() // worker:
			// https://nodejs.org/api/cluster.html#cluster_cluster_fork_env
		}
		break
	case 'development':
	case 'test':
	default:
		startService()
	}
}
