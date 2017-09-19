/* eslint-env browser */
import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'

import Root from './components/Root.js'

if (typeof document === 'object') {
	const root = document.getElementById('root')
	if (root) ReactDOM.render(<Root />, root)
	// eslint-disable-next-line no-console
	else console.log('no element: #root')
}