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
						if (task ['require-authorization']) {
							return scraper.exec ('is-authorized', tab)
								.then (function (authorized) {
									if (!authorized) {
										return scraper.exec ('authorize', tab)
											.then (authorizeDelay);
									}
								});
						} else {
							return true;
						}
					})

					.then (function (authorized) {
						if (!authorized) {
							return scraper.exec ('authorize', tab)
								.then (authorizeDelay);
						}
					});
			})

			.then (function () {
				return scraper.createTab (task.url);
			})

			.then (function (tab) {
				return scraper.exec ('explain', tab);
			})

			.then (emitter)

			.fin (function () {
				return scraper.closeWindow ();
			});
	};
});