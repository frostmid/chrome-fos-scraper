define (['libs/scraper', 'libs/q'], function (Scraper, Q) {
	var authorizeDelay = function () {
		var deferred = Q.defer ();
		setTimeout (deferred.resolve, 5 * 1000);
		return deferred.promise;
	};

	return function (task) {
		var emitter = this.emitter (task),
			scraper = new Scraper (task);
		
		return scraper.start ()
			.then (function (tab) {
				return scraper.exec ('check-site', tab)
					.then (function () {
						return scraper.exec ('is-authorized', tab)
							.then (function (authorized) {
								if (!authorized) {
									return scraper.exec ('authorize', tab)
										.then (authorizeDelay);
								}
							});
					})
					.then (function () {
						return scraper.exec ('is-authorized', tab)
							.then (function (authorized) {
								if (!authorized) {
									throw new Error ('Authorization failed');
								}
							})
					})
					.then (function () {
						return tab;
					});
			})

			.then (function (tab) {
				return scraper.exec ('resolve-token', tab);
			})

			.then (function (url) {
				return scraper.createTab (url);
			})

			.then (function (tab) {
				return scraper.exec ('explain', tab);
			})

			.then (function (entry) {
				entry.tokens = [
					task._prefetch.token._id
				];

				return entry;
			})

			.then (emitter)

			.fail (function (error) {
				console.log ('error', error);
			})

			.fin (function () {
				return scraper.closeWindow ();
			});
	};
});