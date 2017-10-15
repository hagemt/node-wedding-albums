/* eslint-env es6, mocha, node */
const Bunyan = require('bunyan')
const test = require('supertest')
const _ = require('lodash')

const log = new Bunyan({
	component: 'server',
	level: 'fatal',
	name: 'test',
})

const LOCALHOST_IPV6 = '::ffff:127.0.0.1'

class Data extends Map {
	constructor () {
		super()
		const images = Array.from({ length: 1170 }, (none, index) => (index + 1))
		for (const image of images) this.set(`images:${image}:favorites`, new Set())
		this.set(`person:${LOCALHOST_IPV6}:favorites`, new Set())
	}
	inspect () {
		return Array.from(this)
	}
}

const data = new Data() // tests may manipulate this
const mock = require('../server/providers.js')
const MockRedis = require('ioredis-mock').default
mock.getStorage = _.once(() => new MockRedis({ data }))
mock.getLogger = _.once(() => log.child({ data }))
const server = require('../server/index.js')

describe('server', () => {

	it('works', (done) => {
		test(server.createService())
			.get('/favorites')
			.expect(200, done)
	})

})
