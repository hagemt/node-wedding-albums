/* eslint-env browser */
import URL from 'url'

import React from 'react'
import Types from 'prop-types'

import { Button, Card, CardImg, CardBlock } from 'reactstrap'

class Image extends React.Component {

	constructor (props) {
		super(props)
		this.state = {
			countLaughs: props.countLaughs,
			countLoves: props.countLoves,
			isLoading: false, // === disabled
			lastError: null, // show message?
			userLaughs: props.userLaughs,
			userLoves: props.userLoves,
		}
	}

	async toggleLaughs (url) {
		// any re-entry is not allowed:
		if (this.state.isLoading) return
		try {
			this.setState({ isLoading: true })
			await window.fetch(url, {
				method: this.state.userLaughs ? 'DELETE' : 'POST',
				mode: 'cors',
			})
			this.setState(({ countLaughs, userLaughs }) => {
				const updated = countLaughs + (userLaughs ? -1 : +1)
				return { countLaughs: updated, userLaughs: !userLaughs }
			})
		} catch (error) {
			this.setState({ lastError: error })
			// eslint-disable-next-line no-console
			console.error(error)
		} finally {
			this.setState({ isLoading: false })
		}
	}

	async toggleLoves (url) {
		// any re-entry is not allowed:
		if (this.state.isLoading) return
		try {
			this.setState({ isLoading: true })
			await window.fetch(url, {
				method: this.state.userLoves ? 'DELETE' : 'POST',
				mode: 'cors',
			})
			this.setState(({ countLoves, userLoves }) => {
				const updated = countLoves + (userLoves ? -1 : +1)
				return { countLoves: updated, userLoves: !userLoves }
			})
		} catch (error) {
			this.setState({ lastError: error })
			// eslint-disable-next-line no-console
			console.error(error)
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
			<Card className='at-field image-card text-center'>
				<a href={imageURL} target='_blank'>
					<CardImg alt={padded} className='card-img-top circle' src={thumbnailURL} title={hoverText} />
				</a>
				<CardBlock className='btn-group'>
					<Button disabled={isLoading} onClick={onClickLoves}>{buttonTextLoves}</Button>
					<Button disabled={isLoading} onClick={onClickLaughs}>{buttonTextLaughs}</Button>
				</CardBlock>
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
