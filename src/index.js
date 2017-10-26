/* eslint-env browser */
import React from 'react'
import ReactDOM from 'react-dom'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/css/bootstrap-grid.css'
import 'bootstrap/dist/css/bootstrap-reboot.css'

import './index.css'
import './cards.css'
import './fade.css'

import Root from './components/Root.js'

if (typeof document === 'object') {
	const root = document.getElementById('root')
	if (root) ReactDOM.render(<Root />, root)
	// eslint-disable-next-line no-console
	else console.log('no element: #root')
}
