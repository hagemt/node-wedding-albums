/* eslint-env node */
module.exports = {
	apps: [
		{
			env: {
				NODE_ENV: 'development'
				// default port: 8080
			},
			env_production: {
				PM2_API_IPADDR: '127.0.0.1',
				NODE_ENV: 'production'
			},
			exec_mode: 'cluster',
			instances: 2,
			max_memory_restart: '1G',
			name: 'wedding-albums',
			script: 'api/index.js',
			watch: false,
		}
	],
}
