import React from 'react'
import Types from 'prop-types'

import Image from './Image.js'

const Album = ({ numbers, title, url }) => {
	const images = Array.from(numbers, (number, index) => (
		<Image key={index} number={number} url={url} />
	))
	return (
		<div className="album">
			<h1 className="album-head">{title}</h1>
			<div className="album-body">{images}</div>
		</div>
	)
}

Album.propTypes = {
	numbers: Types.arrayOf(Types.number),
	title: Types.string,
	url: Types.string,
}

export default Album

