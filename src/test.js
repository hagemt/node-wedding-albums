/* eslint-env browser, mocha */
import React from 'react'
import { render } from 'react-dom'

import Root from './components/Root.js'

it('renders without crashing', () => {
	render(<Root />, document.createElement('div'))
})
