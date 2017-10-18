/* eslint-env node */

// eslint-disable-next-line no-console
console.log(`

	For development, in separate terminals:

	* npm run server # default PORT=9000
	* npm run client # default PORT=3000

	For production, run these commands:
	
	* # To generate a production bundle:
	* react-scripts build # public + src
	* rm -r -f -v served/wedding-albums
	* mv build served/wedding-albums

	* # To start the necessary services on Linux:
	* sudo systemctl start redis # laughs + loves
	* NODE_ENV=production PORT=80 npm run server

	See package.json for details.

`)

process.exitCode = 1
