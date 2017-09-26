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
const ITEMS_PER_PAGE = 15 // 2x3x3x5x13

const favoritesMap = ({ images, people }) => {
	const favorites = {} // constructed sensitive to order
	const numbers = new Set(people[Object.keys(people)[0]])
	for (const key of Object.keys(images)) {
		favorites[key] = Object.freeze({
			countFavorites: images[key], // Number
			isFavorite: numbers.has(Number(key)),
		})
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
		const favorites = favoritesMap(await this.fetchFavorites({ numbers })) // ordered
		this.setState(({ pages }) => ({ loading: false, pages: pages.set(album, { favorites, offset, length }) }))
	}

	async fetchFavorites ({ numbers }) {
		this.setState(() => ({ loading: true }))
		const id = Array.from(numbers).join(',')
		const url = `${BASE_URL}/favorites?id=${id}`
		try {
			const response = await window.fetch(url, { mode: 'cors' })
			if (response.status !== 200) throw new Error(response.status)
			const { images, people } = await response.json()
			return Object.freeze({ images, people })
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
			const onClick = () => this.setPage({ favorites, length, offset: offset - length }) // move offset back
			buttons.unshift(<Button disabled={disabled} key='root-control-previous' onClick={onClick}>&lt;&lt;</Button>)
		}
		if (inRange(offset + length)) {
			const onClick = () => this.setPage({ favorites, length, offset: offset + length }) // move forward
			buttons.push(<Button disabled={disabled} key='root-control-next' onClick={onClick}>&gt;&gt;</Button>)
		}
		return (
			<div className="root">
				<div className="root-header">{buttons}</div>
				<Album favorites={favorites} title={album.title} url={url} />
				<div className="root-footer">
					<span>Photos by <a href="http://icantakeyourpicture.com">Mitchell Joyce</a>.</span>
					<span>Website by <a href="https://github.com/hagemt">Tor E Hagemann</a>.</span>
					<span>&copy; Copyright 2017, resp.</span>
				</div>
			</div>
		)
	}

}

export default Root
