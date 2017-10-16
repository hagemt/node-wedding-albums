/* eslint-env browser, es6 */
import querystring from 'querystring'

import fetch from 'isomorphic-fetch'

import Immutable from 'immutable'
import React from 'react'

import {
	Badge,
	Button,
	ButtonDropdown,
	ButtonGroup,
	Collapse,
	DropdownItem,
	DropdownMenu,
	DropdownToggle,
	Jumbotron,
	Nav,
	Navbar,
	NavbarBrand,
	NavbarToggler,
	NavLink,
	UncontrolledTooltip,
} from 'reactstrap'

import Album from './Album.js'

// constants (could be loaded from env)
const BASE_URL = 'http://localhost:9000'
const ITEMS_PER_PAGE = 65 // small product of factors:
const ALBUM_ITEMS = 1170 // factors of 1170: 2 3 3 5 13
const ALBUM_TITLE = '2017-08-20' // album directory:
const ALBUM_URL = `${BASE_URL}/images/${ALBUM_TITLE}`

const BY_SITE_FAVORITES = (left, right) => {
	const sameLoves = left.countLoves === right.countLoves
	const sameLaughs = left.countLaughs === right.countLaughs
	if (!sameLoves) return right.countLoves - left.countLoves
	if (!sameLaughs) return right.countLaughs - left.countLaughs
	return left.number - right.number // tie breaker: number
}

const BY_USER_FAVORITES = (left, right) => {
	const bothLoves = left.userLoves && right.userLoves
	const bothLaughs = left.userLaughs && right.userLaughs
	const sameLoves = left.countLoves === right.countLoves
	const sameLaughs = left.countLaughs === right.countLaughs
	if (!bothLoves) return right.userLoves - left.userLoves
	if (!bothLaughs) return right.userLaughs - left.userLaughs
	if (!sameLoves) return right.countLoves - left.countLoves
	if (!sameLaughs) return right.countLaughs - left.countLaughs
	return left.number - right.number // tie breaker: number
}

const BY_IMAGE_NUMBER = ({ number: left }, { number: right }) => (left - right) // default
const favoritesArray = ({ images1, images2, people1, people2 }, order = BY_IMAGE_NUMBER) => {
	const favorites = new Map() // FIXME (hagemt): this is so awful
	const numbers1 = new Set(people1[Object.keys(people1)[0]])
	const numbers2 = new Set(people2[Object.keys(people2)[0]])
	for (const key of Object.keys(images1)) {
		const number = Number(key) // key is always numeric
		const favorite = favorites.get(number) || { number }
		favorite.countLaughs = images1[key] // value
		favorite.userLaughs = numbers1.has(number)
		favorites.set(number, favorite)
	}
	for (const key of Object.keys(images2)) {
		const number = Number(key) // key is always numeric
		const favorite = favorites.get(number) || { number }
		favorite.countLoves = images2[key] // value
		favorite.userLoves = numbers2.has(number)
		favorites.set(number, favorite)
	}
	return Object.freeze(Array.from(favorites.values(), value => Object.freeze(value)).sort(order))
}

const inRange = (index, items = ALBUM_ITEMS) => {
	return !(index < 0) && (index < items)
}

const randomSample = (count = ITEMS_PER_PAGE, items = ALBUM_ITEMS) => {
	const numbers = Array.from({ length: items }, (none, index) => (index + 1))
	// Fisher–Yates algorithm (Durstenfeld variation):
	for (let i = numbers.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		const k = numbers[i]
		numbers[i] = numbers[j]
		numbers[j] = k
	}
	return numbers.slice(0, count)
}

// hack to allow ?page=N for N \in [1,65] to move the offset to a correct position
const START_QUERY = Number(querystring.decode(window.location.search)['?page']) || 1
const START_PAGE = inRange(START_QUERY, ALBUM_ITEMS / ITEMS_PER_PAGE + 1) ? START_QUERY : 1
//window.history.pushState(null, null, window.location.origin) // for ditching query string

const delayMS = (millis = 0) => new Promise(resolve => setTimeout(resolve, millis))
const fetchAll = (all, options) => Promise.all(all.map(one => fetch(one, options)))

class Navigation extends React.Component {

	constructor (...args) {
		super(...args)
		this.state = {
			isOpen: true,
		}
	}

	toggle () {
		this.setState({
			isOpen: !this.state.isOpen,
		})
	}

	render () {
		// eslint-disable-next-line react/prop-types
		const { children, refresh } = Object(this.props)
		return (
			<Navbar expand='lg' light>
				<NavbarToggler onClick={() => this.toggle()} />
				<NavbarBrand href='#' id='instructions' onClick={refresh}>All Photos <Badge>{ALBUM_ITEMS}</Badge></NavbarBrand>
				<UncontrolledTooltip target='instructions'>
					Click thumbnails for full-size download/view; click the buttons if you laugh, or if you see something you love.
				</UncontrolledTooltip>
				<Collapse isOpen={this.state.isOpen} navbar>
					<Nav navbar>
						<div className='text-center'>{children}</div>
					</Nav>
					<Nav navbar>
						<NavLink href='#only-favorites' onClick={refresh}>Only Favorites <Badge>Your Picks</Badge></NavLink>
					</Nav>
					<Nav navbar>
						<NavLink href='#only-popular' onClick={refresh}>Only Popular <Badge>With Everyone</Badge></NavLink>
					</Nav>
					<Nav navbar>
						<NavLink href='#photo-roulette' onClick={refresh}>Photo Roulette <Badge>Random Sample</Badge></NavLink>
					</Nav>
				</Collapse>
			</Navbar>
		)
	}

}

class Pagination extends React.Component {

	constructor (...args) {
		super(...args)
		this.state = {
			isOpen: false,
		}
	}

	toggle () {
		this.setState({
			isOpen: !this.state.isOpen,
		})
	}

	render () {
		// eslint-disable-next-line react/prop-types
		const { page, pages } = Object(this.props)
		const items = Array.from({ length: pages }, (none, index) => (
			<DropdownItem key={index} href={`/?page=${index + 1}`}>Page {index + 1}</DropdownItem>
		))
		return (
			<ButtonDropdown isOpen={this.state.isOpen} key='root-dropdown' toggle={() => this.toggle()}>
				<DropdownToggle caret>{`Page ${page} of ${pages}`}</DropdownToggle>
				<DropdownMenu>{items}</DropdownMenu>
			</ButtonDropdown>
		)
	}

}

class Root extends React.Component {

	constructor (...args) {
		super(...args) // Root takes no props, but may have children
		const INITIAL_OFFSET = ITEMS_PER_PAGE * (START_PAGE - 1)
		const album = Object.freeze({
			favorites: Object.freeze([]),
			length: ITEMS_PER_PAGE,
			offset: INITIAL_OFFSET,
		})
		this.state = {
			// only one album, for the moment:
			albums: Immutable.Map.of(null, album),
			favorites: null, // only for site/user
			isLoading: false, // disables buttons
			lastError: null, // logged to console
		}
	}

	componentWillMount () {
		// will trigger initial favorites fetch:
		this.switchPage(this.state.albums.get(null))
	}

	async fetchFavorites ({ numbers }) {
		try {
			this.setState({ isLoading: true })
			const url1 = `${BASE_URL}/laughs?id=${Array.from(numbers).join()}`
			const url2 = `${BASE_URL}/loves?id=${Array.from(numbers).join()}`
			const [response1, response2] = await fetchAll([url1, url2], { mode: 'cors' })
			if (response1.status !== 200) throw new Error(`${response1.status} !== 200`)
			if (response2.status !== 200) throw new Error(`${response2.status} !== 200`)
			const { images: images1, people: people1 } = await response1.json()
			const { images: images2, people: people2 } = await response2.json()
			return Object.freeze({ images1, images2, people1, people2 })
		} catch (error) {
			this.setState({ lastError: error })
			// eslint-disable-next-line no-console
			console.error(error)
			throw error
		} finally {
			this.setState({ isLoading: false })
		}
	}

	async switchPage ({ offset, length }) {
		if (!(length > 0) || !inRange(offset) || !inRange(offset + length - 1)) return
		const numbers = Array.from({ length }, (none, index) => (offset + index + 1))
		const favorites = favoritesArray(await this.fetchFavorites({ numbers }))
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
				const object = await this.fetchFavorites({ numbers: [] }) // all
				for (const favorite of favoritesArray(object, BY_USER_FAVORITES)) {
					const { userLaughs, userLoves } = favorite // two Booleans
					if (userLaughs || userLoves) favorites.push(favorite)
				}
				this.setState({ favorites: Object.freeze(favorites) })
				break
			}
			case '#only-popular': {
				const favorites = [] // filtered as follows:
				this.setState({ favorites: Object.freeze([]) })
				const object = await this.fetchFavorites({ numbers: [] }) // all
				for (const favorite of favoritesArray(object, BY_SITE_FAVORITES)) {
					const { countLaughs, countLoves } = favorite // two Numbers
					if (countLaughs > 0 || countLoves > 0) favorites.push(favorite)
				}
				this.setState({ favorites: Object.freeze(favorites) })
				break
			}
			case '#photo-roulette': {
				const favorites = [] // filtered as follows:
				this.setState({ favorites: Object.freeze([]) })
				const object = await this.fetchFavorites({ numbers: randomSample() })
				favorites.push(...favoritesArray(object, () => 0)) // order already random
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

	render () {
		const isLoading = this.state.isLoading // prevents double-loading
		const { favorites, length, offset } = this.state.albums.get(null)
		const buttons = [] // built and embedded based on pseudo-route
		// N.B. should really be refactored into another component:
		if (this.state.favorites) {
			buttons.push(<Button href='#' key='root-pagination' onClick={() => this.switchView()}>Return to Album View</Button>)
		} else {
			const page = Math.floor(offset / ITEMS_PER_PAGE) + 1 // 0 < page
			const pages = Math.ceil(ALBUM_ITEMS / ITEMS_PER_PAGE) // page < pages
			buttons.push(<Pagination key='root-pagination' page={page} pages={pages} />)
			if (inRange(offset - length)) {
				const onClick = () => this.switchPage({ length, offset: offset - length }) // moves offset back one page
				buttons.unshift(<Button disabled={isLoading} key='root-pagination-left' onClick={onClick}>Previous</Button>)
			} else {
				const onClick = () => this.switchPage({ length, offset: ALBUM_ITEMS - length }) // moves to final page
				buttons.unshift(<Button disabled={isLoading} key='root-pagination-left' onClick={onClick}>Last</Button>)
			}
			if (inRange(offset + length + 1)) {
				const onClick = () => this.switchPage({ length, offset: offset + length }) // moves offset up one page
				buttons.push(<Button disabled={isLoading} key='root-pagination-right' onClick={onClick}>Next</Button>)
			} else {
				const onClick = () => this.switchPage({ length, offset: 0 }) // move offset to initial page, instead?
				buttons.push(<Button disabled={isLoading} key='root-pagination-right' onClick={onClick}>First</Button>)
			}
		}
		return (
			<div className='root text-center'>
				<Navigation className='root-header' refresh={() => this.switchView()}>
					<ButtonGroup className='at-field'>{buttons}</ButtonGroup>
				</Navigation>
				{this.state.favorites
					? (this.state.favorites.length === 0)
						? (<Jumbotron className='at-field'>{isLoading ? 'Loading...' : 'Nothing to see here.'}</Jumbotron>)
						: (<Album favorites={this.state.favorites} title={ALBUM_TITLE} url={ALBUM_URL} />)
					: (<Album favorites={favorites} title={ALBUM_TITLE} url={ALBUM_URL} />)
				}
				<div className='at-field root-footer text-center'>
					<span className='d-block'>Photos by <a href='http://icantakeyourpicture.com'>Mitchell Joyce</a></span>
					<span className='d-block'>Website by <a href='https://github.com/hagemt'>Tor E Hagemann</a></span>
					<span className='d-block'>&copy; Copyright 2017, respective parties</span>
				</div>
				<Button href='#'>Back to Top</Button>
			</div>
		)
	}

}

export default Root
