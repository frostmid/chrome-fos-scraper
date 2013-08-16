require (['libs/slave', 'features/messages', 'features/explain', 'features/resolve-token', 'features/private-messages', 'features/response', 'libs/socket.io'], function (Slave, scrapeMessages, scrapeUrl, resolveToken, scrapePrivateMessages, response) {
	var url = 'http://siab.frossa.ru:8001',
		restart = function () {
			_.delay (_.bind (window.location.reload, window.location), 2500);
		};

	window.onerror = function (error, file, line) {
		console.error ('Uncaught error', error, 'in file', file, 'on line', line);
		_.delay (restart, 2500);
	};

	(new Slave ({
		'title': 'web scraper',
		'version': '0.0.6',
		'max-tasks': 5,
		'timeout': 30 * 60, // seconds
	}, {
		'restart': restart
	}))
		.use ('urn:fos:sync:feature/cf6681b2f294c4a7a648ed2bf196df4c', scrapeMessages)
		.use ('urn:fos:sync:feature/01c4b1eacc107b8de1d977d95a523986', scrapeUrl)
		.use ('urn:fos:sync:feature/fd15698a8ef5c786f830221f0cdfc92e', resolveToken)
		.use ('urn:fos:sync:feature/0c9d7b33dec4872ab03788a0ffe20792', scrapePrivateMessages)
		.use ('urn:fos:sync:feature/43d8ef1b4a646e2f9f955f4964959565', response)

		.fail (function (error) {
			console.error ('Could not connect to master', error);
			restart ();
		})

		.connect (io, url);
});
