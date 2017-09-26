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
			isLaughs: props.isLaughs,
			isLoves: props.isLoves,
			isLoading: false,
		}
	}

	async toggleLaughs (href) {
		const { isLaughs, isLoading } = Object(this.state)
		if (isLoading) return // re-entry is not allowed
		try {
			this.setState(() => ({ isLoading: true }))
			const method = isLaughs ? 'DELETE' : 'POST'
			await window.fetch(href, { method, mode: 'cors' })
			this.setState(({ countLaughs, isLaughs }) => {
				const updated = countLaughs + (isLaughs ? -1 : +1)
				return { countLaughs: updated, isLaughs: !isLaughs }
			})
		} catch (error) {
			console.error(error) // eslint-disable-line no-console
		} finally {
			this.setState(() => ({ isLoading: false }))
		}
	}

	async toggleLoves (href) {
		const { isLoves, isLoading } = Object(this.state)
		if (isLoading) return // re-entry is not allowed
		try {
			this.setState(() => ({ isLoading: true }))
			const method = isLoves ? 'DELETE' : 'POST'
			await window.fetch(href, { method, mode: 'cors' })
			this.setState(({ countLoves, isLoves }) => {
				const updated = countLoves + (isLoves ? -1 : +1)
				return { countLoves: updated, isLoves: !isLoves }
			})
		} catch (error) {
			console.error(error) // eslint-disable-line no-console
		} finally {
			this.setState(() => ({ isLoading: false }))
		}
	}

	render () {
		const { number, url } = Object(this.props)
		const padded = String(number).padStart(4, '0')
		const hoverText = `Image #${padded} (${url})`
		const imageLink = `${url}/fullsize/${padded}.jpg`
		const thumbnailLink = `${url}/thumbnail/${padded}.png`
		const { host, protocol } = URL.parse(url) // may POST/DELETE to:
		const laughsLink = `${protocol}//${host}/laughs?id=${number}`
		const lovesLink = `${protocol}//${host}/loves?id=${number}`
		// all lines above above could/should be removed from render
		const onClickLaughs = () => this.toggleLaughs(laughsLink)
		const onClickLoves = () => this.toggleLoves(lovesLink)
		const { countLaughs, countLoves, isLaughs, isLoves, isLoading } = Object(this.state)
		const buttonTextLaughs = `${isLaughs ? '🤔' : '😂' } (${countLaughs})`
		const buttonTextLoves = `${isLoves ? '💔' : '💟'} (${countLoves})`
		return (
			<Card className='image'>
				<a className='image-link' href={imageLink}>
					<CardImg alt={padded} className='card-img-top circle' src={thumbnailLink} title={hoverText} />
				</a>
				<CardBlock className='image-block'>
					<Button disabled={isLoading} onClick={onClickLaughs}>{buttonTextLaughs}</Button>
					<Button disabled={isLoading} onClick={onClickLoves}>{buttonTextLoves}</Button>
				</CardBlock>
			</Card>
		)
	}

}

Image.propTypes = {
	countLaughs: Types.number,
	countLoves: Types.number,
	isLaughs: Types.bool,
	isLoves: Types.bool,
	number: Types.number,
	url: Types.string,
}

export default Image
