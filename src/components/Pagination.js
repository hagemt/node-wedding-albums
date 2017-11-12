import React from 'react'

import {
	ButtonDropdown,
	DropdownItem,
	DropdownMenu,
	DropdownToggle,
} from 'reactstrap'

import { PUBLIC_URL } from '../constants.js'

export default class Pagination extends React.Component {

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
			<DropdownItem key={`root-dropdown-${index}`} href={`${PUBLIC_URL}?page=${index + 1}`}>Page {index + 1}</DropdownItem>
		))
		return (
			<ButtonDropdown isOpen={this.state.isOpen} key='root-dropdown' toggle={() => this.toggle()}>
				<DropdownToggle caret>{`Page ${page} of ${pages}`}</DropdownToggle>
				<DropdownMenu>{items}</DropdownMenu>
			</ButtonDropdown>
		)
	}

}

