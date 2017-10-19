/* eslint-env browser, mocha */
import React from 'react'
import { render } from 'react-dom'

import * as C from './constants.js'
import Root from './components/Root.js'

const LOCAL_IP = C.LOCAL_IP || '::ffff:127.0.0.1' // default IPv6 localhost
const NUMBERS = Array.from({ length: 1170 }, (none, index) => (index + 1))

const randomInteger = (n = 1, r = Math.random()) => Math.floor(r * n)

const mapObject = (iterable, toObject) => Array.from(iterable)
	.reduce((object, next) => Object.assign(object, toObject(next)), {})

const images = all => mapObject(all, one => ({ [one]: randomInteger(10) + 1 }))
const people = all => ({ [LOCAL_IP]: Array.from(all).filter(() => !randomInteger(2)) })

// basically a dynamic fixture (mock API):
const fetchFavorites = async ({ numbers }) => {
	const all = new Set(numbers) // may be augmented if absent
	if (all.size === 0) for (const number of NUMBERS) all.add(number)
	const laughs = { images: images(all), people: people(all), _id: LOCAL_IP }
	const loves = { images: images(all), people: people(all), _id: LOCAL_IP }
	return { laughs, loves }
}

it('renders without crashing', () => {
	Root.prototype.fetchFavorites = fetchFavorites
	render(<Root />, document.createElement('div'))
})
