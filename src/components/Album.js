import React from 'react'
import Types from 'prop-types'

import { CSSTransition, TransitionGroup } from 'react-transition-group'

import Image from './Image.js'

const Album = ({ favorites, title, url }) => {
	const transitions = Array.from(favorites, (favorite) => (
		<CSSTransition classNames='fade' key={favorite.number} timeout={1000}>
			<Image
				countLaughs={favorite.countLaughs}
				countLoves={favorite.countLoves}
				number={favorite.number}
				userLaughs={favorite.userLaughs}
				userLoves={favorite.userLoves}
				url={url} />
		</CSSTransition>
	))
	const classes = ['album', 'at-field', 'text-center']
	if (transitions.length === 0) classes.push('d-none')
	return (
		<div className={classes}>
			<div className='album-head at-field'>
				<h2 className='text-center'>{title}</h2>
			</div>
			<div className='album-body card-columns'>
				<TransitionGroup>{transitions}</TransitionGroup>
			</div>
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

