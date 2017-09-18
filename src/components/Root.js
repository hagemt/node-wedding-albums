import React from 'react'

import Album from './Album.js'

const Root = () => {
	const title = '2017-08-20'
	const url = `http://localhost:8000/${title}`
	return (
		<div className="root">
			<Album count={1170} offset={0} title={title} url={url} />
		</div>
	)
}

export default Root
