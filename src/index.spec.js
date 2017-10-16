/* eslint-env browser, es6, mocha, node */
import React from 'react'
import { render } from 'react-dom'

import Root from './components/Root.js'

const LOCAL_IP = process.env.LOCAL_IP || '::ffff:127.0.0.1' // lol, idk
const NUMBERS = Array.from({ length: 1170 }, (none, index) => (index + 1))

const randomSmallInteger = (max = 1, r = Math.random()) => Math.floor(r * max)

const mapValuesFrom = (iterable, toObject) => Array.from(iterable)
	.reduce((object, next) => Object.assign(object, toObject(next)), {})

const fetchFavorites = async ({ numbers }) => {
	const all = new Set(numbers) // may be augmented if absent
	if (all.size === 0) for (const number of NUMBERS) all.add(number)
	const images1 = mapValuesFrom(all, one => ({ [one]: randomSmallInteger(10) + 1 }))
	const images2 = mapValuesFrom(all, one => ({ [one]: randomSmallInteger(10) + 1 }))
	const people1 = { [LOCAL_IP]: Array.from(numbers).filter(() => !randomSmallInteger(1)) }
	const people2 = { [LOCAL_IP]: Array.from(numbers).filter(() => !randomSmallInteger(1)) }
	return { images1, images2, people1, people2 }
}

it('renders without crashing', () => {
	Root.prototype.fetchFavorites = fetchFavorites
	render(<Root />, document.createElement('div'))
})
