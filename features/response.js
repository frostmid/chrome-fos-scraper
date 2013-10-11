define (['libs/scraper', 'libs/q', 'features/private-messages'], function (Scraper, Q, scrapePrivateMessages) {
	return function (task) {
		var self = this,
			emitter = this.emitter (task),
			scraper = new Scraper (task),
			cancelled = false;

		this.onCancel (task._id, function () {
			cancelled = true;
			scraper.closeWindow ();
		});

		return scraper.start ()
			.then (function (tab) {
				return scraper.exec ('check-site', tab)
					.then (function () {
						if (task ['token']) {
							return scraper.exec ('is-authorized', tab)
								.then (function (authorized) {
									if (!authorized) {
										return scraper.exec ('authorize', tab)
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
					var subTask = _.clone (task);
					subTask ['scrape-start'] = subTask ['previous-poll'] = null;

					feature.call (self, task)
						.then (deferred.resolve, deferred.reject)
						.done ();
				});
				
				return deferred.promise;
			})

			.fail (function (error) {
				if (!cancelled) {
					return Q.reject (error);
				}
			})

			.fin (function () {
				if (!cancelled) {
					return scraper.closeWindow ();
				}
			});
	};
});