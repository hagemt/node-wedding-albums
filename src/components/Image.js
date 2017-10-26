/* eslint-env browser */
import React from 'react'
import Types from 'prop-types'

import fetch from 'isomorphic-fetch'
import { padStart } from 'lodash'

import {
	Badge,
	Button,
	Card,
	CardImg,
	CardFooter,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	Modal,
	ModalBody,
	ModalHeader,
	ModalFooter,
} from 'reactstrap'

class Image extends React.Component {

	constructor (props) {
		super(props)
		this.state = {
			countLaughs: props.countLaughs,
			countLoves: props.countLoves,
			isLoading: false, // === disabled
			isModalOpen: false, // implies useModal
			lastError: null, // does not show message
			useModal: true, // would A/B test
			userLaughs: props.userLaughs,
			userLoves: props.userLoves,
		}
	}

	toggleModal () {
		this.setState({
			isModalOpen: !this.state.isModalOpen,
		})
	}

	async toggleLaughs (url) {
		// any re-entry is not allowed:
		if (this.state.isLoading) return
		try {
			this.setState({ isLoading: true, lastError: null })
			const method = this.state.userLaughs ? 'DELETE' : 'POST'
			const response = await fetch(url, { method, mode: 'cors' })
			if (response.status !== 200) throw new Error(response.status)
			this.setState(({ countLaughs, userLaughs }) => {
				const updated = countLaughs + (userLaughs ? -1 : +1)
				return { countLaughs: updated, userLaughs: !userLaughs }
			})
		} catch (error) {
			this.setState({ lastError: error })
			// eslint-disable-next-line no-console
			console.error(error) // otherwise silent
		} finally {
			this.setState({ isLoading: false })
		}
	}

	async toggleLoves (url) {
		// any re-entry is not allowed:
		if (this.state.isLoading) return
		try {
			this.setState({ isLoading: true, lastError: null })
			const method = this.state.userLoves ? 'DELETE' : 'POST'
			const response = await fetch(url, { method, mode: 'cors' })
			if (response.status !== 200) throw new Error(response.status)
			this.setState(({ countLoves, userLoves }) => {
				const updated = countLoves + (userLoves ? -1 : +1)
				return { countLoves: updated, userLoves: !userLoves }
			})
		} catch (error) {
			this.setState({ lastError: error })
			// eslint-disable-next-line no-console
			console.error(error) // otherwise silent
		} finally {
			this.setState({ isLoading: false })
		}
	}

	render () {
		const isLoading = this.state.isLoading
		const { number, url } = Object(this.props)
		const padded = padStart(number, 4, '0')
		const hoverText = `Image #${padded} (${url})`
		const imageURL = `${url}/fullsize/${padded}.jpg`
		const thumbnailURL = `${url}/thumbnail/${padded}.png`
		// all lines above above could/should be removed from render
		const onClickLaughs = () => this.toggleLaughs(`/api/v1/laughs?id=${number}`)
		const onClickLoves = () => this.toggleLoves(`/api/v1/loves?id=${number}`)
		const { countLaughs, countLoves, userLaughs, userLoves } = Object(this.state)
		const [userBoth, userOne] = [userLaughs && userLoves, userLaughs || userLoves] // gold, red, green, teal:
		const scoreFlair = userOne ? userLoves ? userBoth ? 'bg-warning' : 'bg-danger' : 'bg-success' : 'bg-info'
		// needs to be centered:
		const scoreInputGroup = (
			<InputGroup size='sm'>
				<InputGroupAddon>
					<Badge className={scoreFlair}>&ensp;</Badge>
				</InputGroupAddon>
				<InputGroupButton disabled={isLoading} onClick={onClickLoves}>
					{`${userLoves ? '😺' : '😻'} ${countLoves} LUV`}
				</InputGroupButton>
				<InputGroupButton disabled={isLoading} onClick={onClickLaughs}>
					{`${userLaughs ? '😺' : '😹'} ${countLaughs} LOL`}
				</InputGroupButton>
				<InputGroupAddon>
					{`Score: ${countLaughs + countLoves}`}
				</InputGroupAddon>
			</InputGroup>
		)
		return (
			<Card>
				<Modal className='album-image-modal' isOpen={this.state.isModalOpen} toggle={() => this.toggleModal()}>
					<ModalHeader>
						Click image, save to download (#{padded})
					</ModalHeader>
					<ModalBody>
						<a download href={imageURL} title={hoverText} target='_blank'>
							<img alt={padded} height='100%' src={imageURL} width='100%' />
						</a>
					</ModalBody>
					<ModalFooter>
						{scoreInputGroup}
						<Button onClick={() => this.toggleModal()}>Done</Button>
					</ModalFooter>
				</Modal>
				{this.state.useModal
					? (
						<CardImg
							alt={padded}
							className='card-img-top img-fluid'
							onClick={() => this.toggleModal()}
							src={thumbnailURL}
							title={hoverText}
							top />
					)
					: (
						<a download href={imageURL} title={hoverText} target='_blank'>
							<img alt={padded} className='card-img-top img-fluid' src={thumbnailURL} />
						</a>
					)
				}
				<CardFooter>
					{scoreInputGroup}
				</CardFooter>
			</Card>
		)
	}

}

Image.propTypes = {
	countLaughs: Types.number.isRequired,
	countLoves: Types.number.isRequired,
	number: Types.number.isRequired,
	url: Types.string.isRequired,
	userLaughs: Types.bool.isRequired,
	userLoves: Types.bool.isRequired,
}

export default Image
