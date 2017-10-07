import React from 'react'
import Types from 'prop-types'

import ReactCSSTransitionGroup from 'react-addons-css-transition-group'

import Image from './Image.js'

const Album = ({ favorites, title, url }) => {
	const images = Array.from(favorites, (favorite) => {
		return (
			<ReactCSSTransitionGroup
				transitionAppear={true}
				transitionAppearTimeout={2000}
				transitionEnter={false}
				transitionLeave={false}
				transitionName='album-image'
				key={favorite.number} >
				<Image
					countLaughs={favorite.countLaughs}
					countLoves={favorite.countLoves}
					number={favorite.number}
					userLaughs={favorite.userLaughs}
					userLoves={favorite.userLoves}
					url={url} />
			</ReactCSSTransitionGroup>
		)
	})
	const classes = ['album']
	if (images.length === 0) {
		classes.push('d-none')
	}
	return (
		<div className={classes.join(' ')}>
			<div className='album-head at-field'>
				<h2 className='text-center'>{title}</h2>
			</div>
			<div className='album-body'>{images}</div>
		</div>
	)
}

const favorite = Types.shape({
	countLaughs: Types.number.isRequired,
	countLoves: Types.number.isRequired,
	number: Types.number.isRequired,
	userLaughs: Types.bool.isRequired,
	userLoves: Types.bool.isRequired,
})

Album.propTypes = {
	favorites: Types.arrayOf(favorite).isRequired,
	title: Types.string.isRequired,
	url: Types.string.isRequired,
}

export default Album

