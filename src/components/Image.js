import React from 'react'
import Types from 'prop-types'

class Image extends React.Component {

	render () {
		const { number, url } = this.props
		const padded = String(number).padStart(4, '0')
		const altText = `Image #${padded} (${url})`
		const imageLink = `${url}/fullsize/${padded}.jpg`
		const thumbnailLink = `${url}/thumbnail/${padded}.png`
		return (
			<div className="image">
				<a href={imageLink}>
					<img alt={altText} src={thumbnailLink} />
				</a>
			</div>
		)
	}

}

Image.propTypes = {
	number: Types.number,
	url: Types.string,
}

export default Image
