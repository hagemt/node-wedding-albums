/* eslint-env es6, node */
const Process = require('child_process')

const HTTP = require('http')
const HTTPS = require('https')
const path = require('path')
const URL = require('url')

const json = url => new Promise((resolve, reject) => {
	const headers = { 'user-agent': __filename }
	const options = Object.assign({ headers, method: 'GET' }, URL.parse(url))
	const request = url.startsWith('https') ? HTTPS.request(options) : HTTP.request(options)
	request.once('error', reject) // bad end
	request.once('response', (response) => {
		if (response.statusCode !== 200) {
			reject(new Error(response.statusCode))
			return // don't even bother with body
		}
		const buffers = [] // JSON body
		response.once('error', reject)
		response.once('end', () => {
			try {
				resolve(JSON.parse(Buffer.concat(buffers)))
			} catch (error) {
				reject(error)
			}
		})
		response.on('data', (buffer) => {
			buffers.push(buffer)
		})
	})
	request.end()
})

const fetchBoth = async ({ ALBUMS_DOMAIN = 'leah-and-tor.love' }) => {
	const request = url => json(`http://${ALBUMS_DOMAIN}/${url}`) // => Promise
	const [laughs, loves] = await Promise.all(['laughs', 'loves'].map(request))
	const scores = new Map() // Integer -> Sets
	for (let i = 1, n = 1170; i < n; i += 1) {
		// any score Function can be substituted here:
		const score = laughs.images[i] + loves.images[i]
		const set = scores.get(score) || new Set()
		scores.set(score, set.add(i)) // by score
	}
	// extract the key-maximal level-set of values, in natural order; i.e. "best" pictures [1, 2, 3]
	const max = Array.from(scores, ([score]) => score).reduce((best, next) => Math.max(best, next), 0)
	if (!(max > 0)) throw new Error('max score was not positive; everyone hates everything')
	const all = Array.from(scores.get(max)).sort((left, right) => (right - left))
	return Object.freeze(Object.assign(all, { score: max }))
}

if (!module.parent) {
	fetchBoth(process.env)
		.then((result) => {
			const album = path.resolve(__dirname, '..', 'images', '2017-08-20', 'fullsize') // path to images
			const paths = result.map(number => path.resolve(album, `${String(number).padStart(4, '0')}.jpg`))
			console.log(`eog ${paths.join(' ')} # max: ${result.score}`) // eslint-disable-line no-console
			Process.spawnSync('/usr/bin/eog', paths, { detached: true }) // open w/ "Eye of Gnome"
		})
		.catch((reason) => {
			// eslint-disable-next-line no-console
			console.error(reason)
			process.exit(1)
		})
}
