import React from 'react'
import Types from 'prop-types'

import ReactCSSTransitionGroup from 'react-addons-css-transition-group'

import Image from './Image.js'

const Album = ({ favorites, title, url }) => {
	const images = Object.keys(favorites).map((key) => {
		const { countFavorites, isFavorite } = Object(favorites[key])
		return (
			<ReactCSSTransitionGroup
				key={key}
				transitionAppear={true}
				transitionEnter={false}
				transitionLeave={false}
				transitionName="image"
				>
				<Image countFavorites={countFavorites} isFavorite={isFavorite} number={Number(key)} url={url} />
			</ReactCSSTransitionGroup>
		)
	})
	return (
		<div className="album">
			<h1 className="album-head">{title}</h1>
			<div className="album-body">{images}</div>
		</div>
	)
}

Album.propTypes = {
	favorites: Types.object, // Immutable.Map
	numbers: Types.arrayOf(Types.number),
	title: Types.string,
	url: Types.string,
}

export default Album

