/* eslint-env browser */
import React from 'react'
import ReactDOM from 'react-dom'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/css/bootstrap-grid.css'
import 'bootstrap/dist/css/bootstrap-reboot.css'

/*
// dark, hacker:
import './images/ng-background-dot.png'
import './styles/bootstrap4-neon-glow.css'
*/

/*
// light, rounded:
import './images/vs-cloud-1@2x.png'
import './images/vs-cloud-1.png'
import './images/vs-cloud-2@2x.png'
import './images/vs-cloud-2.png'
import './images/vs-fish-1@2x.png'
import './images/vs-fish-1.png'
import './images/vs-octopus-1@2x.png'
import './images/vs-octopus-1.png'
import './styles/bootstrap4-vibrant-sea.css'
*/

/*
// light, square-ish:
import './styles/bootstrap4-business-tycoon.css'
*/

import './styles/index.css'
import './styles/cards.css'
import './styles/fade.css'

import Root from './components/Root.js'

if (typeof document === 'object') {
	const root = document.getElementById('root')
	if (root) ReactDOM.render(<Root />, root)
	// eslint-disable-next-line no-console
	else console.log('no element: #root')
}
