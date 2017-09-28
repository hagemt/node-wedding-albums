import React from 'react'
import Types from 'prop-types'

import ReactCSSTransitionGroup from 'react-addons-css-transition-group'

import Image from './Image.js'

const Album = ({ favorites, title, url }) => {
	const images = Object.keys(favorites).map((key) => {
		const { countLaughs, countLoves, isLaughs, isLoves } = Object(favorites[key])
		return (
			<ReactCSSTransitionGroup
				key={key}
				transitionAppear={true}
				transitionAppearTimeout={2000}
				transitionEnter={false}
				transitionLeave={false}
				transitionName='image'
			>
				<Image
					countLaughs={countLaughs}
					countLoves={countLoves}
					isLaughs={isLaughs}
					isLoves={isLoves}
					number={Number(key)}
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

Album.propTypes = {
	favorites: Types.object,
	title: Types.string,
	url: Types.string,
}

export default Album

