/* eslint-env node */
const assert = require('assert')
const path = require('path')

const fetch = require('isomorphic-fetch')

const fetchJSON = async (all, options) => {
	const responses = await Promise.all(all.map(one => fetch(one, options)))
	for (const response of responses) assert.equal(response.status, 200, 'status')
	return Promise.all(responses.map(response => response.json())) // awaitable
}

const ALBUM_DOMAIN = process.env.ALBUM_DOMAIN || 'leah-and-tor.love'
const ALBUM_PATH = path.resolve(__dirname, '..', 'images', '2017-08-20')
const SUM_TOTAL = ({ id, laughs, loves }) => (laughs.images[id] + loves.images[id])

const findPopular = async (score = SUM_TOTAL, ...args) => {
	const [laughs, loves] = await fetchJSON([
		`http://${ALBUM_DOMAIN}/laughs?id=${args.join()}`,
		`http://${ALBUM_DOMAIN}/loves?id=${args.join()}`,
	])
	const scores = new Map() // Number -> Sets
	for (let id = 1; id <= 1170; id += 1) {
		const number = score({ id, laughs, loves })
		const set = scores.get(number) || new Set()
		scores.set(number, set.add(id))
	}
	// extract the key-maximal level-set of values, in natural order; i.e. "best" pictures [1, 2, 3]
	const max = Array.from(scores, ([number]) => number).reduce((best, next) => Math.max(best, next), 0)
	const all = Array.from(scores.get(max)).sort((left, right) => (left - right)) // ascending numbers
	const resolve = id => path.resolve(ALBUM_PATH, 'fullsize', `${String(id).padStart(4, '0')}.jpg`)
	return Object.freeze(Object.assign(all.map(one => resolve(one)), { max }))
}

if (!module.parent) {
	findPopular()
		.then((paths) => {
			/* Image Viewer (Linux): */// eslint-disable-next-line no-console
			console.log(['eog', ...paths, `# max: ${paths.max}`].join(' \\\n'))
		})
		.catch((fatal) => {
			// eslint-disable-next-line no-console
			console.error(fatal)
			process.exit(1)
		})
}
