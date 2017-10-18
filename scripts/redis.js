/* eslint-env node */
const OS = require('os')
const Process = require('child_process')

const redisCLI = (...args) => {
	const { output, status } = Process.spawnSync('redis-cli', args)
	if (status) throw new Error(output[2].toString()) // stderr
	else return output[1].toString().trim() // part of stdout
}

const systemctl = (...args) => { // assumes Linux system by default:
	const { output, status } = Process.spawnSync('sudo', ['systemctl', ...args])
	if (status) throw new Error(output[2].toString()) // stderr from systemctl
	else return output[1].toString() // stdout; N.B. output might be truncated
}

const backup = async (background = false) => {
	await redisCLI(background ? 'BGSAVE' : 'SAVE')
	const lastsave = await redisCLI('LASTSAVE') // UNIX time
	return `LASTSAVE: ${new Date(lastsave * 1000).toISOString()}`
}

const restore = async () => {
	throw new Error('not implemented')
}

const start = async () => {
	const platform = OS.platform()
	switch (platform) {
	case 'linux': return systemctl('start', 'redis')
	default: throw new Error(`unsupported platform: ${platform}`)
	}
}

const stop = async () => {
	const platform = OS.platform()
	switch (platform) {
	case 'linux': return systemctl('stop', 'redis')
	default: throw new Error(`unsupported platform: ${platform}`)
	}
}

module.exports = {
	backup,
	restore,
	start,
	stop,
}

const execute = async command => {
	/* eslint-disable no-console */
	try {
		const stdout = await command() // contract: will throw on fail
		if (stdout) console.warn(`${command.name} redis: ${stdout} (stdout)`)
		else console.log(`${command.name} redis: PASS`) // complete success
	} catch (error) {
		console.error(error, `${command.name} redis: FAIL`)
		process.exitCode = 1
	}
	/* eslint-enable no-console */
}

if (!module.parent) {
	const functions = Object.freeze([backup, restore, start, stop])
	const aliases = new Map(functions.map(fn => [fn.name, fn]))
	const alias = process.argv[2]
	if (aliases.has(alias)) {
		execute(aliases.get(alias))
	} else {
		// eslint-disable-next-line no-console
		console.error(`valid commands: ${Array.from(aliases.keys()).join(' | ')}`)
	}
}
