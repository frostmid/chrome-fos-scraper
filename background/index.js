require (['libs/slave', 'features/messages', 'features/explain', 'libs/socket.io'], function (Slave, scrapeMessages, scrapeUrl) {
	// var url = 'http://89.179.119.16:8001';
	var url = 'http://127.0.0.1:8001';

	(new Slave)
		.use ('urn:fos:sync:feature/cf6681b2f294c4a7a648ed2bf196df4c', scrapeMessages)
		.use ('urn:fos:sync:feature/01c4b1eacc107b8de1d977d95a523986', scrapeUrl)

		.fail (function (error) {
			console.error ('Could not connect to master');

			var reconnect = _.bind (function () {
				this.connect (io, url)
			}, this);
			
			_.delay (reconnect, 1000);
		})

		.connect (io, url);
});
