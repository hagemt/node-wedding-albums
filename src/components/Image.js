/* eslint-env browser */
import URL from 'url'

import React from 'react'
import Types from 'prop-types'

const buildFavoriteImageLink = (url, number) => {
	const { origin } = new URL(url) // parser
	return `${origin}/favorites?id=${number}`
}

const onClickFavorite = (isFavorite, url) => {
	const method = isFavorite ? 'DELETE' : 'POST'
	return () => window.fetch(url, { method })
}

const Image = ({ isFavorite, number, url }) => {
	const padded = String(number).padStart(4, '0')
	const altText = `Image #${padded} (${url})`
	const imageLink = `${url}/fullsize/${padded}.jpg`
	const thumbnailLink = `${url}/thumbnail/${padded}.png`
	const favoritesLink = buildFavoriteImageLink(url, number)
	const onClick = onClickFavorite(!isFavorite, favoritesLink)
	const text = isFavorite ? '- Favorite' : '+ Favorite'
	return (
		<div className="image">
			<a href={imageLink}>
				<img alt={altText} src={thumbnailLink} />
			</a>
			<button onClick={onClick}>{text}</button>
		</div>
	)
}

Image.propTypes = {
	isFavorite: Types.boolean,
	number: Types.number,
	url: Types.string,
}

export default Image
