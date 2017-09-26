/* eslint-env browser, es6 */
import querystring from 'querystring'

import Immutable from 'immutable'
import React from 'react'

import { Button } from 'reactstrap'

import Album from './Album.js'

const album = Object.freeze({
	title: '2017-08-20',
	total: 1170,
})

const BASE_URL = 'http://localhost:8000'
const ITEMS_PER_PAGE = 18 // 2x3x3x5x13

const favoritesMap = ({ images1, images2, people1, people2 }) => {
	const favorites = {} // constructed sensitive to order
	const numbers1 = new Set(people1[Object.keys(people1)[0]])
	const numbers2 = new Set(people2[Object.keys(people2)[0]])
	for (const key of Object.keys(images1)) {
		favorites[key] = (key in favorites ? favorites[key] : Immutable.Map.of())
			.set('countLaughs', images1[key]) // Number
			.set('isLaughs', numbers1.has(Number(key)))
	}
	for (const key of Object.keys(images2)) {
		favorites[key] = (key in favorites ? favorites[key] : Immutable.Map.of())
			.set('countLoves', images2[key]) // Number
			.set('isLoves', numbers2.has(Number(key)))
	}
	for (const key of Object.keys(favorites)) {
		favorites[key] = favorites[key].toJSON()
	}
	return Object.freeze(favorites)
}

const inRange = (index, total = album.total) => {
	return !(index < 0) && (index < total)
}

const textPage = (index, total = album.total) => {
	const page = Math.floor(index / ITEMS_PER_PAGE) + 1
	const pages = Math.ceil(total / ITEMS_PER_PAGE)
	return `Page ${page} of ${pages}`
}

// hack to allow ?start=0 to move the 
const START_QUERY = Number(querystring.decode(window.location.search)['?start']) // or NaN
const START_INDEX = inRange(START_QUERY, album.total - ITEMS_PER_PAGE) ? START_QUERY : 0

class Root extends React.Component {

	constructor (...args) {
		super(...args)
		this.state = {
			loading: false, // flag buttons
			pages: Immutable.Map.of(album, {
				favorites: Object.freeze({}),
				length: ITEMS_PER_PAGE,
				offset: START_INDEX,
			}),
		}
	}

	componentWillMount () {
		this.setPage(this.state.pages.get(album))
	}

	async setPage ({ offset, length }) {
		if (!inRange(offset) || !inRange(offset + length)) return
		const numbers = Array.from({ length }, (none, index) => (offset + index + 1))
		const favorites = favoritesMap(await this.fetchFavorites({ numbers })) // frozen
		this.setState(({ pages }) => ({ loading: false, pages: pages.set(album, { favorites, offset, length }) }))
	}

	async fetchFavorites ({ numbers }) {
		try {
			this.setState(() => ({ loading: true }))
			const id = Array.from(numbers).join(',')
			const url1 = `${BASE_URL}/laughs?id=${id}`
			const url2 = `${BASE_URL}/loves?id=${id}`
			const response1 = await window.fetch(url1, { mode: 'cors' })
			const response2 = await window.fetch(url2, { mode: 'cors' })
			if (response1.status !== 200) throw new Error(response1.status)
			if (response2.status !== 200) throw new Error(response2.status)
			const { images: images1, people: people1 } = await response1.json()
			const { images: images2, people: people2 } = await response2.json()
			return Object.freeze({ images1, images2, people1, people2 })
		} catch (error) {
			console.error(error) // eslint-disable-line no-console
		} finally {
			this.setState(() => ({ loading: false }))
		}
	}

	render () {
		// eslint-disable-next-line react/prop-types
		const disabled = this.state.loading // prevent clicks
		const url = `http://localhost:8000/albums/${album.title}`
		const { favorites, length, offset } = this.state.pages.get(album)
		const buttons = [<span key='root-control-current'>{textPage(offset)}</span>]
		if (inRange(offset - length)) {
			const onClick = () => this.setPage({ length, offset: offset - length }) // move offset back (unit: length)
			buttons.unshift(<Button disabled={disabled} key='root-control-previous' onClick={onClick}>&lt;&lt;</Button>)
		}
		if (inRange(offset + length)) {
			const onClick = () => this.setPage({ length, offset: offset + length }) // move offset forward
			buttons.push(<Button disabled={disabled} key='root-control-next' onClick={onClick}>&gt;&gt;</Button>)
		}
		return (
			<div className="root">
				<div className="root-header">{buttons}</div>
				<Album favorites={favorites} title={album.title} url={url} />
				<div className="root-footer">
					<span>Photos by <a href="http://icantakeyourpicture.com">Mitchell Joyce</a></span>
					<span>Website by <a href="https://github.com/hagemt">Tor E Hagemann</a></span>
					<span>&copy; Copyright 2017, respectively</span>
				</div>
			</div>
		)
	}

}

export default Root
