/* eslint-env mocha, node */
const assert = require('assert')
const test = require('supertest')

const mock = require('./mocks.js')()
const real = require('./index.js')

describe('API (favorites)', () => {

	const keyImage = any => `image:${any}:favorites`
	const keyPerson = any => `person:${any}:favorites`

	const randomNumber = '4' // see: https://xkcd.com/221/
	const randomNumbers = () => [randomNumber, '44', '444']

	const LOCAL_IP = process.env.LOCAL_IP  || '::ffff:127.0.0.1' // lol, idk, man
	const IMAGES = Array.from({ length: 1170 }, (none, index) => String(index + 1))
	const service = {} // will obtain server from createService, passed to supertest

	const hasSubSet = (a, b) => Array.from(a).every(e => b.has(e))
	const filterSet = (a, b) => Array.from(a).filter(e => !b.has(e))
	const equalSets = (a, b) => hasSubSet(a, b) && hasSubSet(b, a)

	const assertSetEquality = (actual, expected, label) => {
		assert(actual instanceof Set, `"actual" is not ${label} Set`)
		assert(expected instanceof Set, `"expected" is not ${label} Set`)
		const diff = { left: filterSet(actual, expected), right: filterSet(expected, actual) }
		assert(equalSets(actual, expected), `${label} Sets not equal: ${JSON.stringify(diff)}`)
	}

	before(() => {
		Object.assign(service, real.createService())
	})

	beforeEach(() => {
		mock.data.set(keyPerson(LOCAL_IP), new Set())
		for (const id of IMAGES) {
			mock.data.set(keyImage(id), new Set())
		}
	})

	describe('list (all)', () => {

		// mock data will be manipulated to match the contents of this Map:
		const idSetsByIP = new Map().set(LOCAL_IP, new Set(randomNumbers()))

		beforeEach(() => {
			for (const [ip, idSet] of idSetsByIP) {
				for (const id of idSet) {
					const ipSet = mock.data.get(keyImage(id))
					mock.data.set(keyImage(id), ipSet.add(ip))
					const idSet = mock.data.get(keyPerson(ip))
					mock.data.set(keyPerson(ip), idSet.add(id))
				}
			}
		})

		it('returns 200', () => {
			return test(service.server)
				.get('/api/v0/favorites?id=') // all
				.expect(200)
				.then((response) => {
					const idSet = idSetsByIP.get(LOCAL_IP)
					const orderByNaturalNumbering = (left, right) => Number(left) - Number(right)
					const assign = (object, key, value) => Object.assign(object, { [key]: value ? 1 : 0 })
					const cardinalities = IMAGES.reduce((all, one) => assign(all, one, idSet.has(one)), {})
					const favorites = { [LOCAL_IP]: Array.from(idSet).sort(orderByNaturalNumbering) }
					assert.deepEqual(response.body.images, cardinalities, 'invalid cardinalities')
					assert.deepEqual(response.body.people, favorites, 'invalid favorites')
				})
		})

		afterEach(() => {
			const idSet = mock.data.get(keyPerson(LOCAL_IP))
			assertSetEquality(idSet, idSetsByIP.get(LOCAL_IP), 'id')
			for (const id of IMAGES) {
				const ipSet = mock.data.get(keyImage(id))
				const expected = new Set() // empty unless:
				if (idSet.has(id)) expected.add(LOCAL_IP)
				assertSetEquality(ipSet, expected, 'ip')
			}
		})

	})

	describe('increment (one)', () => {

		beforeEach(() => {
			mock.data.set(keyImage(randomNumber), new Set())
			mock.data.set(keyPerson(LOCAL_IP), new Set())
		})

		it('returns 200', () => {
			return test(service.server)
				.post(`/api/v0/favorites?id=${randomNumber}`)
				.expect(200)
		})

		afterEach(() => {
			const idSet = mock.data.get(keyPerson(LOCAL_IP))
			const ipSet = mock.data.get(keyImage(randomNumber))
			assertSetEquality(idSet, new Set([randomNumber]), 'id')
			assertSetEquality(ipSet, new Set([LOCAL_IP]), 'ip')
		})

	})

	describe('decrement (one)', () => {

		beforeEach(() => {
			mock.data.set(keyImage(randomNumber), new Set([LOCAL_IP]))
			mock.data.set(keyPerson(LOCAL_IP), new Set([randomNumber]))
		})

		it('returns 200', () => {
			return test(service.server)
				.delete(`/api/v0/favorites?id=${randomNumber}`)
				.expect(200)
		})

		afterEach(() => {
			const idSet = mock.data.get(keyPerson(LOCAL_IP))
			const ipSet = mock.data.get(keyImage(randomNumber))
			assertSetEquality(idSet, new Set(), 'id')
			assertSetEquality(ipSet, new Set(), 'ip')
		})

	})

	afterEach(() => {
		mock.data.clear()
	})

	after(() => {
		mock.undo()
	})

})
