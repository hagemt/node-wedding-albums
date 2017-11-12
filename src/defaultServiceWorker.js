/* eslint-env browser */
/* eslint-disable no-console */
import fetch from 'isomorphic-fetch'

import { NODE_ENV, PUBLIC_URL } from './constants.js'

const installSW = swURL => navigator.serviceWorker.register(swURL)
	.then((registration) => {
		registration.onupdatefound = () => {
			const installing = registration.installing
			installing.onstatechange = () => {
				if (installing.state === 'installed') {
					if (navigator.serviceWorker.controller) {
						console.log('New content is available; please refresh.')
					} else {
						console.log('Content is cached for offline use.')
					}
				}
			}
		}
	})
	.catch((error) => {
		console.error('Error during service worker registration:', error)
	})

const validateSW = swURL => fetch(swURL)
	.then((response) => {
		if (response.status === 404) {
			return navigator.serviceWorker.ready.then((registration) => {
				registration.unregister().then(() => {
					window.location.reload()
				})
			})
		}
		return installSW(swURL)
	})
	.catch(() => {
		console.log('No internet connection found; running in offline mode.')
	})

const LOCAL_HOST = new Set(['localhost', '[::1]']) // or, 127.0.0.1, etc.
const LOCAL_IPV4 = /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
const isLocal = hostname => LOCAL_HOST.has(hostname) || LOCAL_IPV4.test(hostname)
export const IS_LOCALHOST = isLocal(window.location.hostname)
export const IS_DISABLED = NODE_ENV !== 'production'

export const enable = () => {
	if ('serviceWorker' in navigator) {
		if (IS_DISABLED) return
		const locationURL = new URL(PUBLIC_URL, window.location)
		if (locationURL.origin !== window.location.origin) return
		window.addEventListener('load', () => {
			const swURL = `${PUBLIC_URL}/service-worker.js`
			if (IS_LOCALHOST) validateSW(swURL) // fetch, first
			else installSW(swURL) // then install new SW script
		})
	}
}

export const disable = () => {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.ready.then(registration => registration.unregister())
	}
}

export default enable
