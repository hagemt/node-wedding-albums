import React from 'react'
import Types from 'prop-types'

import Image from './Image.js'

class Album extends React.Component {

	render () {
		const { count, offset, title, url } = this.props
		const images = Array.from({ length: count }, (none, index) => (
			<Image key={index} number={offset + index + 1} url={url} />
		))
		return (
			<div className="album">
				<h1 className="album-head">{title}</h1>
				<div className="album-body">{images}</div>
			</div>
		)
	}

}

Album.propTypes = {
	count: Types.number,
	offset: Types.number,
	title: Types.string,
	url: Types.string,
}

export default Album
