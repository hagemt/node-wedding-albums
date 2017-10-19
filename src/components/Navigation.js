import React from 'react'

import {
	Badge,
	Collapse,
	Nav,
	Navbar,
	NavbarBrand,
	NavbarToggler,
	NavLink,
	UncontrolledTooltip,
} from 'reactstrap'

import { ALBUM_ITEMS } from '../constants.js'

export default class Navigation extends React.Component {

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

