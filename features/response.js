define (['libs/scraper', 'libs/q', 'features/private-messages'], function (Scraper, Q, scrapePrivateMessages) {
	var authorizeDelay = function () {
		var deferred = Q.defer ();
		setTimeout (deferred.resolve, 5 * 1000);
		return deferred.promise;
	};

	return function (task) {
		var self = this,
			emitter = this.emitter (task),
			scraper = new Scraper (task);

		return scraper.start ()
			.then (function (tab) {
				return scraper.exec ('check-site', tab)
					.then (function () {
						if (task ['token']) {
							return scraper.exec ('is-authorized', tab)
								.then (function (authorized) {
									if (!authorized) {
										return scraper.exec ('authorize', tab)
											.then (authorizeDelay)

											.then (function () {
												return scraper.exec ('is-authorized', tab);
											})
											.then (function (authorized) {
												if (!authorized) {
													throw new Error ('Authorization failed');
												}
											});
									}
								});
						} else {
							return true;
						}
					});
			})

			.then (function () {
				return scraper.createTab (task.url);
			})

			.then (function (tab) {
				return scraper.exec ('response', tab);
			})

			.then (function (depency) {
				var deferred = Q.defer ();

				require ([depency], function (feature) {
					feature.call (self, task)
						.then (deferred.resolve, deferred.reject)
						.done ();
				});
				
				return deferred.promise;
			})

			.fin (function () {
				return scraper.closeWindow ();
			});
	};
});