/* eslint-env browser */
import URL from 'url'

import React from 'react'
import Types from 'prop-types'

import { Button, Card, CardImg, CardBlock } from 'reactstrap'

class Image extends React.Component {

	constructor (props) {
		super(props)
		this.state = {
			countFavorites: props.countFavorites,
			isFavorite: props.isFavorite,
			isLoading: false,
		}
	}

	async toggleFavorite (href) {
		const { isFavorite, isLoading } = Object(this.state)
		if (isLoading) return // re-entry is not allowed
		try {
			this.setState(() => ({ isLoading: true }))
			const method = isFavorite ? 'DELETE' : 'POST'
			await window.fetch(href, { method, mode: 'cors' })
			this.setState(({ countFavorites, isFavorite }) => {
				const updated = countFavorites + (isFavorite ? -1 : +1)
				return { countFavorites: updated, isFavorite: !isFavorite }
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
		const favoritesLink = `${protocol}//${host}/favorites?id=${number}`
		// all lines above above could/should be removed from render
		const onClick = () => this.toggleFavorite(favoritesLink)
		const { countFavorites, isFavorite, isLoading } = Object(this.state)
		const buttonText = `${isFavorite ? '💔' : '💟'} (${countFavorites})`
		return (
			<Card className='image'>
				<a href={imageLink}>
					<CardImg alt={padded} className='card-img-top circle' src={thumbnailLink} title={hoverText} />
				</a>
				<CardBlock>
					<Button disabled={isLoading} onClick={onClick}>{buttonText}</Button>
				</CardBlock>
			</Card>
		)
	}

}

Image.propTypes = {
	countFavorites: Types.number,
	isFavorite: Types.bool,
	number: Types.number,
	url: Types.string,
}

export default Image
