import React from 'react'
import Types from 'prop-types'

const Image = ({ folder, number }) => {
	const altText = `Image #${number} (${folder})`
	const imageLink = `${folder}/fullsize/${number}.jpg`
	const thumbnailLink = `${folder}/thumbnail/._${number}.jpg`
	return (
		<div className="image">
			<a href={thumbnailLink}>
				<img alt={altText} src={imageLink} />
			</a>
		</div>
	)
}

Image.propTypes = {
	folder: Types.string,
	number: Types.number,
}

const Album = ({ count = 1170, offset = 0, title = '2017-08-20' }) => {
	const images = Array.from({ length: count - offset }, (none, index) => (
		<Image folder={`/${title}`} key={index} number={offset + index + 1} />
	))
	return (
		<div className="album">
			<h1 className="album-head">${title}</h1>
			<div className="album-body">${images}</div>
		</div>
	)
}

Album.propTypes = {
	count: Types.number,
	offset: Types.number,
	title: Types.string,
}

const Root = () => (
	<div className="root">
		<Album title="2017-08-20" />
	</div>
)

export default Root
