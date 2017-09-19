import { Map as ImmutableMap } from 'immutable'

import React from 'react'

import Album from './Album.js'

const album = Object.freeze({
	title: '2017-08-20',
	total: 1170,
})

class Root extends React.Component {

	constructor (...args) {
		super(...args)
		this.state = {
			pages: ImmutableMap.of(album, {
				offset: 0, // start from first image
				length: 10, // this is the page size
			}),
		}
	}

	setPage ({ offset, length }) {
		// TODO: noop if invalid?
		this.setState(({ pages }) => {
			if (album.total < offset + length) return {} // noop
			return { pages: pages.set(album, { offset, length }) }
		})
	}

	render () {
		// eslint-disable-next-line react/prop-types
		const { length, offset } = this.state.pages.get(album)
		const url = `http://localhost:8000/albums/${album.title}`
		const images = Array.from({ length }, (none, index) => (offset + index + 1))
		const buttons = []
		if (!(offset - length < 0)) {
			buttons.shift(<button onClick={() => this.page({ length, offset: offset - length })}>Previous</button>)
		}
		if (offset + length < album.total) {
			buttons.shift(<button onClick={() => this.page({ length, offset: offset + length })}>Next</button>)
		}
		return (
			<div className="root">
				<Album images={images} title={album.title} url={url} />
				<div className="album-controls">{buttons}</div>
			</div>
		)
	}

}

export default Root
