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
	Navbar,
	NavbarBrand,
	NavLink,
	Popover,
	PopoverContent,
	PopoverTitle,
	UncontrolledTooltip,
} from 'reactstrap'

import Album from './Album.js'

const album = Object.freeze({
	title: '2017-08-20',
	total: 1170,
})

const BASE_URL = 'http://localhost:8000' // switch to CDN
const ITEMS_PER_PAGE = 65 // product of factors of 1170
const ALBUM_URL = `${BASE_URL}/albums/${album.title}`

const favoritesMap = ({ images1, images2, people1, people2 }) => {
	const favorites = {} // FIXME (hagemt): this is so inefficient:
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

const propsPagination = (index, total = album.total) => {
	const page = Math.floor(index / ITEMS_PER_PAGE) + 1
	const pages = Math.ceil(total / ITEMS_PER_PAGE)
	return Object.freeze({ page, pages })
}

// hack to allow ?page=N for N \in [1,65] to move the offset to a correct position
const START_QUERY = Number(querystring.decode(window.location.search)['?page']) || 1
const START_PAGE = inRange(START_QUERY, album.total / ITEMS_PER_PAGE) ? START_QUERY : 1
window.history.pushState(null, null, window.location.origin) // ditch query string

class Pagination extends React.Component {

	constructor (props) {
		super(props)
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
		const { page, pages } = this.props // ew
		const items = Array.from({ length: pages }, (none, index) => (
			<DropdownItem key={index} href={`/?page=${index + 1}`}>Page {index + 1}</DropdownItem>
		))
		return (
			<ButtonDropdown isOpen={this.state.isOpen} key='root-dropdown' toggle={() => this.toggle()}>
				<DropdownToggle>{`Page ${page} of ${pages}`}</DropdownToggle>
				<DropdownMenu>{items}</DropdownMenu>
			</ButtonDropdown>
		)
	}

}

// TODO (hagemt): properly decide on toggler
// eslint-disable-next-line react/prop-types
const Navigation = ({ children }) => (
	<Navbar color='faded' light toggleable>
		<NavbarBrand href='/'>All Photos <Badge>{album.total}</Badge></NavbarBrand>
		<NavLink disabled={true} href='#fav' id='fav'>Favorites <Badge>coming soon</Badge></NavLink>
		<UncontrolledTooltip placement='bottom' target='fav'>
			<Popover isOpen={true} target='fav'>
				<PopoverTitle>How It Works</PopoverTitle>
				<PopoverContent>
					When you click on Favorites, only those photos that people like will be shown, in the order of most-favorited.
				</PopoverContent>
			</Popover>
		</UncontrolledTooltip>
		{children}
	</Navbar>
)

class Root extends React.Component {

	constructor (...args) {
		super(...args)
		this.state = {
			isLoading: false, // flag buttons
			pages: Immutable.Map.of(album, {
				favorites: Object.freeze({}),
				length: ITEMS_PER_PAGE, // small constant
				offset: ITEMS_PER_PAGE * (START_PAGE - 1),
			}),
		}
	}

	componentWillMount () {
		this.setPage(this.state.pages.get(album))
	}

	async setPage ({ offset, length }) {
		if (!(length > 0) || !inRange(offset) || !inRange(offset + length - 1)) return
		const numbers = Array.from({ length }, (none, index) => (offset + index + 1))
		const favorites = favoritesMap(await this.fetchFavorites({ numbers })) // frozen
		this.setState(({ pages }) => ({ isLoading: false, pages: pages.set(album, { favorites, offset, length }) }))
	}

	async fetchFavorites ({ numbers }) {
		try {
			this.setState({ isLoading: true })
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
			this.setState({ isLoading: false })
		}
	}

	render () {
		const isLoading = this.state.isLoading // prevent double-loading
		const { favorites, length, offset } = this.state.pages.get(album)
		const { page, pages } = propsPagination(offset) // this is pretty ugly
		const buttons = [<Pagination key='root-pagination' page={page} pages={pages} />]
		if (inRange(offset - length)) {
			const onClick = () => this.setPage({ length, offset: offset - length }) // move offset back
			buttons.unshift(<Button disabled={isLoading} key='root-control-previous' onClick={onClick}>Previous</Button>)
		} else {
			const onClick = () => this.setPage({ length, offset: album.total - length }) // move offset to end
			buttons.unshift(<Button disabled={isLoading} key='root-control-previous' onClick={onClick}>Last</Button>)
		}
		if (inRange(offset + length + 1)) {
			const onClick = () => this.setPage({ length, offset: offset + length }) // move offset forward
			buttons.push(<Button disabled={isLoading} key='root-control-next' onClick={onClick}>Next</Button>)
		} else {
			const onClick = () => this.setPage({ length, offset: 0 }) // reset offset to zero
			buttons.push(<Button disabled={isLoading} key='root-control-next' onClick={onClick}>First</Button>)
		}
		const beta = (!this.state.favorites) ? (<Badge>Pick your Favorites!</Badge>) : (
			<ButtonGroup className='at-field'>
				<Button className='active'>Order: <Badge>default</Badge></Button>
				<Button disabled>By LOLs <Badge>coming soon</Badge></Button>
				<Button disabled>By Likes <Badge>coming soon</Badge></Button>
			</ButtonGroup>
		)
		return (
			<div className='root'>
				<Navigation className='root-header'>
					<ButtonGroup className='at-field'>{buttons}</ButtonGroup>
					{beta}
				</Navigation>
				<Album favorites={{}} title='Favorites' url={ALBUM_URL} />
				<Album favorites={favorites} title={album.title} url={ALBUM_URL} />
				<div className='at-field root-footer text-center'>
					<span className='d-block'>Photos by <a href='http://icantakeyourpicture.com'>Mitchell Joyce</a></span>
					<span className='d-block'>Website by <a href='https://github.com/hagemt'>Tor E Hagemann</a></span>
					<span className='d-block'>&copy; Copyright 2017, respectively</span>
				</div>
			</div>
		)
	}

}

export default Root
