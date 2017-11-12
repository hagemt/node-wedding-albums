/* eslint-env browser */
// eslint-disable-next-line no-undef
export const { LOCAL_IP, NODE_ENV, PUBLIC_URL } = process.env

export const ITEMS_PER_PAGE = 65 // small product of factors:
export const ALBUM_ITEMS = 1170 // factors of 1170: 2 3 3 5 13
export const ALBUM_TITLE = '2017-08-20' // === album directory:
export const ALBUM_URL = `/images/${ALBUM_TITLE}` // relative
export const SITE_ADMIN = 'Tor (or Leah) via Facebook or email'

export const encodeError = (lastError) => {
	return window.btoa(`last Error: ${lastError.message}\n${lastError.stack}`)
}

export const inRange = (index, items = ALBUM_ITEMS) => {
	return !(index < 0) && (index < items)
}

export const BY_LOVES_LAUGHS = (left, right) => {
	const sameLoves = left.countLoves === right.countLoves
	const sameLaughs = left.countLaughs === right.countLaughs
	if (!sameLoves) return right.countLoves - left.countLoves
	if (!sameLaughs) return right.countLaughs - left.countLaughs
	return left.number - right.number // natural order: ascending
}

// combines API responses into favorites:Array<favorite:Object>
// both the Array and the Objects therein will be Object.freeze'd
export const favoritesArray = ({ laughs, loves }, order = () => 0) => {
	const favorites = new Map() // keyed by key:Number
	const keys1 = new Set(laughs.people[laughs._id])
	const keys2 = new Set(loves.people[loves._id])
	for (const key of Object.keys(laughs.images)) {
		const number = Number(key) // key is always numeric
		const favorite = favorites.get(number) || { number }
		favorite.countLaughs = laughs.images[key] // Number
		favorite.userLaughs = keys1.has(key) // Boolean
		favorites.set(number, favorite) // may be no-op
	}
	for (const key of Object.keys(loves.images)) {
		const number = Number(key) // key is always numeric
		const favorite = favorites.get(number) || { number }
		favorite.countLoves = loves.images[key] // Number
		favorite.userLoves = keys2.has(key) // Boolean
		favorites.set(number, favorite) // may be no-op
	}
	const values = Array.from(favorites.values(), value => Object.freeze(value))
	return Object.freeze(values.sort(order)) // default order based on API responses
}

export const statusError = response => new Error(`${response.statusText} (${response.url})`)

// N.B. this method is both incorrect (not random) and inefficient:
// return array.slice().sort(() => Math.random() < 0.5 ? -1 : 1)
export const randomizedArray = (array) => {
	const copy = array.slice()
	const swap = (i, j) => {
		const temp = copy[i]
		copy[i] = copy[j]
		copy[j] = temp
	}
	// Fisher–Yates algorithm (Durstenfeld variation):
	for (let i = copy.length - 1; i > 0; i -= 1) {
		swap(i, Math.floor(Math.random() * (i + 1)))
	}
	return copy
}

export const randomizedSample = (count = ITEMS_PER_PAGE, items = ALBUM_ITEMS) => {
	const all = Array.from({ length: items }, (none, index) => (index + 1))
	return randomizedArray(all).slice(0, count) // simple, could be faster
}
