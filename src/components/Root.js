/* eslint-env browser, es6 */
import querystring from 'querystring'

import Immutable from 'immutable'
import React from 'react'

import {
	Badge,
	Button,
	ButtonDropdown,
	ButtonGroup,
	DropdownItem,
	DropdownMenu,
	DropdownToggle,
	Jumbotron,
	Navbar,
	NavbarBrand,
	NavLink,
	UncontrolledTooltip,
} from 'reactstrap'

import Album from './Album.js'

const album = Object.freeze({
	title: '2017-08-20',
	total: 1170,
})

const ITEMS_PER_PAGE = 65 // product of factors of album.total
const BASE_URL = 'http://localhost:9000' // switch to CDN
const ALBUM_URL = `${BASE_URL}/albums/${album.title}`

const BY_SITE = (left, right) => {
	const sameLoves = left.countLoves === right.countLoves
	const sameLaughs = left.countLaughs === right.countLaughs
	if (!sameLoves) return right.countLoves - left.countLoves
	if (!sameLaughs) return right.countLaughs - left.countLaughs
	return left.number - right.number // tie breaker: number
}

const BY_USER = (left, right) => {
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

const BY_NUMBER = ({ number: left }, { number: right }) => (left - right) // default
const favoritesArray = ({ images1, images2, people1, people2 }, order = BY_NUMBER) => {
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

const inRange = (index, total = album.total) => {
	return !(index < 0) && (index < total)
}

// hack to allow ?page=N for N \in [1,65] to move the offset to a correct position
const START_QUERY = Number(querystring.decode(window.location.search)['?page']) || 1
const START_PAGE = inRange(START_QUERY, album.total / ITEMS_PER_PAGE + 1) ? START_QUERY : 1
window.history.pushState(null, null, window.location.origin) // for ditching query string

const delayMS = (millis = 0) => new Promise(resolve => window.setTimeout(resolve, millis))
const fetchAll = (all, options) => Promise.all(all.map(one => window.fetch(one, options)))

// eslint-disable-next-line react/prop-types
const Navigation = ({ children, refresh }) => (
	<Navbar color='faded' light toggleable>
		<NavbarBrand href='#' id='instructions' onClick={refresh}>All Photos <Badge>{album.total}</Badge></NavbarBrand>
		<UncontrolledTooltip target='instructions'>
			Click thumbnails for full-size download/view; click the buttons if you laugh, or if you see something you love.
		</UncontrolledTooltip>
		{children}
		<NavLink href='#site-favorites' onClick={refresh}>Favorites <Badge>Global</Badge></NavLink>
		<NavLink href='#user-favorites' onClick={refresh}>Favorites <Badge>Yours</Badge></NavLink>
	</Navbar>
)

// TODO (hagemt): can this be made pure?
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
		super(...args)
		this.state = {
			albums: Immutable.Map.of(album, {
				favorites: Object.freeze([]), // only album
				length: ITEMS_PER_PAGE, // small constant?
				offset: ITEMS_PER_PAGE * (START_PAGE - 1),
			}),
			favorites: null, // only for site/user
			isLoading: false, // disables buttons
			lastError: null, // logged to console
		}
	}

	componentWillMount () {
		this.setPage(this.state.albums.get(album))
	}

	async fetchFavorites ({ numbers }) {
		try {
			this.setState({ isLoading: true })
			const id = Array.from(numbers).join(',')
			const url1 = `${BASE_URL}/laughs?id=${id}`
			const url2 = `${BASE_URL}/loves?id=${id}`
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
		} finally {
			this.setState({ isLoading: false })
		}
		/*
		// only for testing, but
		// doesn't seem to work
		// (1 person/picture)
		return Object.freeze({
			images1: { 1: 1 },
			images2: { 1: 1 },
			people1: { 1: [1] },
			people2: { 1: [1] },
		})
		*/
	}

	async setPage ({ offset, length }) {
		//await this.switchView() // respond to anchor
		if (!(length > 0) || !inRange(offset) || !inRange(offset + length - 1)) return
		const numbers = Array.from({ length }, (none, index) => (offset + index + 1))
		const favorites = favoritesArray(await this.fetchFavorites({ numbers })) // frozen
		this.setState(({ albums }) => ({ albums: albums.set(album, { favorites, offset, length }) }))
	}

	async switchView () {
		// some browsers are fast or slow
		// the hash may be updated async
		await delayMS(50) // dirty hack
		switch (window.location.hash) {
		case '#site-favorites': {
			const favorites = [] // filtered as follows:
			this.setState({ favorites: Object.freeze([]), isLoading: true })
			const all = await this.fetchFavorites({ numbers: [] })
			for (const favorite of favoritesArray(all, BY_SITE)) {
				const { countLaughs, countLoves } = favorite // two Numbers
				if (countLaughs > 0 || countLoves > 0) favorites.push(favorite)
			}
			this.setState({ favorites: Object.freeze(favorites) })
			break
		}
		case '#user-favorites': {
			const favorites = [] // filtered as follows:
			this.setState({ favorites: Object.freeze([]), isLoading: true })
			const all = await this.fetchFavorites({ numbers: [] })
			for (const favorite of favoritesArray(all, BY_USER)) {
				const { userLaughs, userLoves } = favorite // two Booleans
				if (userLaughs || userLoves) favorites.push(favorite)
			}
			this.setState({ favorites: Object.freeze(favorites) })
			break
		}
		default:
			this.setState({ favorites: null })
		}
	}

	render () {
		const isLoading = this.state.isLoading // prevent double-loading
		const { favorites, length, offset } = this.state.albums.get(album)
		const buttons = [] // built and embedded based on pseudo-route:
		if (this.state.favorites) {
			buttons.push(<Button href='#' key='root-pagination' onClick={() => this.switchView()}>Return to Album View</Button>)
		} else {
			const page = Math.floor(offset / ITEMS_PER_PAGE) + 1 // 0 < page
			const pages = Math.ceil(album.total / ITEMS_PER_PAGE) // page < pages
			buttons.push(<Pagination key='root-pagination' page={page} pages={pages} />)
			if (inRange(offset - length)) {
				const onClick = () => this.setPage({ length, offset: offset - length }) // move offset back
				buttons.unshift(<Button disabled={isLoading} key='root-pagination-left' onClick={onClick}>Previous</Button>)
			} else {
				const onClick = () => this.setPage({ length, offset: album.total - length }) // move offset to end
				buttons.unshift(<Button disabled={isLoading} key='root-pagination-left' onClick={onClick}>Last</Button>)
			}
			if (inRange(offset + length + 1)) {
				const onClick = () => this.setPage({ length, offset: offset + length }) // move offset forward
				buttons.push(<Button disabled={isLoading} key='root-pagination-right' onClick={onClick}>Next</Button>)
			} else {
				const onClick = () => this.setPage({ length, offset: 0 }) // reset offset to zero
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
						? (<Jumbotron className='at-field' fluid>{isLoading ? 'Loading...' : 'No favorites.'}</Jumbotron>)
						: (<Album favorites={this.state.favorites} title='Favorites' url={ALBUM_URL} />)
					: (<Album favorites={favorites} title={album.title} url={ALBUM_URL} />)
				}
				<div className='at-field root-footer text-center'>
					<span className='d-block'>Photos by <a href='http://icantakeyourpicture.com'>Mitchell Joyce</a></span>
					<span className='d-block'>Website by <a href='https://github.com/hagemt'>Tor E Hagemann</a></span>
					<span className='d-block'>&copy; Copyright 2017, respectively</span>
				</div>
				<Button href='#'>Top</Button>
			</div>
		)
	}

}

export default Root
