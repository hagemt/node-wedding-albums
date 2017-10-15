/* eslint-env es6, mocha, node */
const test = require('supertest')

const mock = require('./mocks.js')()
const real = require('./index.js')

describe('API (favorites)', () => {

	const service = {}

	before(() => {
		Object.assign(service, real.createService())
		const LOCAL_IP = process.env.LOCAL_IP  || '::ffff:127.0.0.1'
		mock.data.set(`person:${LOCAL_IP}:favorites`, new Set())
		for (let index = 0; index < 1170; index += 1) {
			mock.data.set(`images:${index + 1}:favorites`, new Set())
		}
	})

	it('returns 200', (done) => {
		test(service.server)
			.get('/favorites')
			.expect(200, done)
	})

	after(() => {
		mock.undo()
	})

})
