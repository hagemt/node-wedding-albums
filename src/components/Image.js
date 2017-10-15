/* eslint-env browser */
import URL from 'url'

import React from 'react'
import Types from 'prop-types'

import fetch from 'isomorphic-fetch'

import { Button, ButtonGroup, Modal, ModalBody, ModalFooter } from 'reactstrap'

class Image extends React.Component {

	constructor (props) {
		super(props)
		this.state = {
			countLaughs: props.countLaughs,
			countLoves: props.countLoves,
			isLoading: false, // === disabled
			isModalOpen: false, // an experiment
			lastError: null, // show message?
			userLaughs: props.userLaughs,
			userLoves: props.userLoves,
		}
	}

	toggle () {
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
		const { number, url } = Object(this.props)
		const padded = String(number).padStart(4, '0')
		const hoverText = `Image #${padded} (${url})`
		const imageURL = `${url}/fullsize/${padded}.jpg`
		const thumbnailURL = `${url}/thumbnail/${padded}.png`
		const { host, protocol } = URL.parse(url) // DELETE/POST url:
		const laughsURL = `${protocol}//${host}/laughs?id=${number}`
		const lovesURL = `${protocol}//${host}/loves?id=${number}`
		// all lines above above could/should be removed from render
		const onClickLaughs = () => this.toggleLaughs(laughsURL)
		const onClickLoves = () => this.toggleLoves(lovesURL)
		const { countLaughs, countLoves, isLoading, userLaughs, userLoves } = Object(this.state)
		const buttonTextLaughs = `${userLaughs ? '😺' : '😹' } (${countLaughs} LOL)`
		const buttonTextLoves = `${userLoves ? '😺' : '😻'} (${countLoves} Like)`
		return (
			<div className='card text-center'>
				<Modal isOpen={this.state.isModalOpen} size='lg' toggle={() => this.toggle()}>
					<ModalBody>
						<a href={imageURL} target='_blank'>
							<img alt={imageURL} height='100%' src={imageURL} width='100%' />
						</a>
					</ModalBody>
					<ModalFooter>
						<ButtonGroup>
							<Button disabled={isLoading} onClick={onClickLoves}>{buttonTextLoves}</Button>
							<Button disabled={isLoading} onClick={onClickLaughs}>{buttonTextLaughs}</Button>
						</ButtonGroup>
						<Button href={imageURL} target='_blank'>Download</Button>
						<Button onClick={() => this.toggle()}>Close</Button>
					</ModalFooter>
				</Modal>
				<img
					alt={padded}
					className='card-img-top img-fluid'
					onClick={() => this.toggle()}
					src={thumbnailURL}
					title={hoverText} />
				<div className='at-field text-center'>
					<ButtonGroup>
						<Button disabled={isLoading} onClick={onClickLoves}>{buttonTextLoves}</Button>
						<Button disabled={isLoading} onClick={onClickLaughs}>{buttonTextLaughs}</Button>
					</ButtonGroup>
				</div>
			</div>
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
