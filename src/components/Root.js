/* eslint-env browser */
import querystring from 'querystring'

import fetch from 'isomorphic-fetch'
import Immutable from 'immutable'
import React from 'react'

import {
	Button,
	ButtonGroup,
	Jumbotron,
} from 'reactstrap'

import * as C from '../constants.js'

import Album from './Album.js'
import Navigation from './Navigation.js'
import Pagination from './Pagination.js'

// hack to allow ?page=N for N \in [1,18] to move the offset to a correct position
const START_QUERY = Number(querystring.decode(window.location.search)['?page']) // may be NaN
const START_PAGE = C.inRange(START_QUERY, C.ALBUM_ITEMS / C.ITEMS_PER_PAGE + 1) ? START_QUERY : 1
if (START_QUERY) window.history.pushState(null, null, C.PUBLIC_URL) // no query in window.location

const delayMS = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)) // hack
const fetchAll = (all, options) => Promise.all(all.map(one => fetch(one, options)))

export default class Root extends React.Component {

	constructor (...args) {
		// TODO: turn some constants into props for functional purity
		super(...args) // Root takes no props, but may have children
		const INITIAL_OFFSET = C.ITEMS_PER_PAGE * (START_PAGE - 1)
		const album = Object.freeze({
			favorites: Object.freeze([]),
			length: C.ITEMS_PER_PAGE,
			offset: INITIAL_OFFSET,
		})
		this.state = {
			// only one album, for the moment:
			albums: Immutable.Map.of(null, album),
			favorites: null, // only for site/user
			isLoading: false, // disables buttons
			lastError: null, // for error report
		}
	}

	componentWillMount () {
		// will trigger initial favorites fetch:
		this.switchPage(this.state.albums.get(null))
	}

	async fetchFavorites ({ numbers }) {
		try {
			this.setState({ isLoading: true, lastError: null })
			const url1 = `/api/v1/laughs?id=${Array.from(numbers).join()}`
			const url2 = `/api/v1/loves?id=${Array.from(numbers).join()}`
			const [response1, response2] = await fetchAll([url1, url2])
			if (response1.status !== 200) throw C.statusError(response1)
			if (response2.status !== 200) throw C.statusError(response2)
			return {
				laughs: await response1.json(),
				loves: await response2.json(),
			}
		} catch (error) {
			this.setState({ lastError: error })
		} finally {
			this.setState({ isLoading: false })
		}
	}

	async switchPage ({ offset, length }) {
		if (!(length > 0) || !C.inRange(offset) || !C.inRange(offset + length - 1)) return
		const numbers = Array.from({ length }, (none, index) => (offset + index + 1))
		const favorites = C.favoritesArray(await this.fetchFavorites({ numbers }))
		this.setState(({ albums }) => ({
			// only album needs updated metadata (Immutable.Map works well here)
			albums: albums.set(null, Object.freeze({ favorites, offset, length })),
		}))
	}

	async switchView () {
		// some browsers are faster/slower
		// location.hash update may be async
		await delayMS(50) // so, dirty hack
		try {
			// TODO: use router (window hash history) instead
			this.setState({ isLoading: true, lastError: null })
			switch (window.location.hash) {
			case '#only-favorites': {
				const favorites = [] // filtered as follows:
				this.setState({ favorites: Object.freeze([]) })
				const all = await this.fetchFavorites({ numbers: [] }) // Object
				for (const favorite of C.favoritesArray(all, C.BY_LOVES_LAUGHS)) {
					const { userLaughs, userLoves } = favorite // both Booleans
					if (userLaughs || userLoves) favorites.push(favorite)
				}
				this.setState({ favorites: Object.freeze(favorites) })
				break
			}
			case '#only-popular': {
				const favorites = [] // filtered as follows:
				this.setState({ favorites: Object.freeze([]) })
				const all = await this.fetchFavorites({ numbers: [] })
				const popular = C.favoritesArray(all, C.BY_LOVES_LAUGHS)
				for (const favorite of popular.slice(0, C.ITEMS_PER_PAGE)) {
					const { countLaughs, countLoves } = favorite // both Numbers
					if (countLaughs > 0 || countLoves > 0) favorites.push(favorite)
				}
				this.setState({ favorites: Object.freeze(favorites) })
				break
			}
			case '#photo-roulette': {
				const favorites = [] // filtered as follows:
				this.setState({ favorites: Object.freeze([]) })
				const sample = C.randomizedSample() // default: single page
				const object = await this.fetchFavorites({ numbers: sample })
				const random = C.randomizedArray(C.favoritesArray(object))
				for (const favorite of random) favorites.push(favorite)
				this.setState({ favorites: Object.freeze(favorites) })
				break
			}
			default:
				this.setState({ favorites: null })
			}
		} catch (error) {
			this.setState({ lastError: error })
		} finally {
			this.setState({ isLoading: false })
		}
	}

	debug () {
		const lastError = this.state.lastError
		if (lastError) {
			window.alert(`Send this (error report) to ${C.SITE_ADMIN}:\n${C.encodeError(lastError)}`)
		} else if (!window.confirm('Error not caught; report again after reproducing the problem.')) {
			window.alert(`Sorry; please report the problem directly to ${C.SITE_ADMIN}.`)
		}
	}

	render () {
		const isLoading = this.state.isLoading // prevents double-loading
		const { favorites, length, offset } = this.state.albums.get(null)
		const buttons = [] // built and embedded based on pseudo-route
		// N.B. should really be refactored into another component:
		if (this.state.favorites) {
			buttons.push(<Button href='#' key='root-pagination' onClick={() => this.switchView()}>Return to Album View</Button>)
		} else {
			const page = Math.floor(offset / C.ITEMS_PER_PAGE) + 1 // 0 < page
			const pages = Math.ceil(C.ALBUM_ITEMS / C.ITEMS_PER_PAGE) // page < pages
			buttons.push(<Pagination key='root-pagination' page={page} pages={pages} />)
			if (C.inRange(offset - length)) {
				const onClick = () => this.switchPage({ length, offset: offset - length }) // moves offset back one page
				buttons.unshift(<Button disabled={isLoading} key='root-pagination-left' onClick={onClick}>Previous</Button>)
			} else {
				const onClick = () => this.switchPage({ length, offset: C.ALBUM_ITEMS - length }) // moves to final page
				buttons.unshift(<Button disabled={isLoading} key='root-pagination-left' onClick={onClick}>Last</Button>)
			}
			if (C.inRange(offset + length + 1)) {
				const onClick = () => this.switchPage({ length, offset: offset + length }) // moves offset up one page
				buttons.push(<Button disabled={isLoading} key='root-pagination-right' onClick={onClick}>Next</Button>)
			} else {
				const onClick = () => this.switchPage({ length, offset: 0 }) // move offset to initial page, instead?
				buttons.push(<Button disabled={isLoading} key='root-pagination-right' onClick={onClick}>First</Button>)
			}
		}
		return (
			<div className='root text-center'>
				<Navigation refresh={() => this.switchView()}>
					<ButtonGroup className='at-field'>{buttons}</ButtonGroup>
				</Navigation>
				{this.state.favorites
					? (this.state.favorites.length === 0)
						? (<Jumbotron className='at-field'>{isLoading ? 'Loading...' : 'Nothing to see here.'}</Jumbotron>)
						: (<Album favorites={this.state.favorites} title={C.ALBUM_TITLE} url={C.ALBUM_URL} />)
					: (<Album favorites={favorites} title={C.ALBUM_TITLE} url={C.ALBUM_URL} />)
				}
				<Button onClick={() => this.debug()}>Report Bug</Button>
				<div className='at-field text-center'>
					<span className='d-block'>Photos by <a href='http://icantakeyourpicture.com'>Mitchell Joyce</a></span>
					<span className='d-block'>Website by <a href='https://github.com/hagemt'>Tor E Hagemann</a></span>
					<span className='d-block'>&copy; Copyright 2017, respective parties</span>
				</div>
				<Button href='#'>Back to Top</Button>
			</div>
		)
	}

}
