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
				var	queue = [task.url],
					index = 0;

				var	fetch = function () {
					if (queue.length <= index) {
						return;
					}

					return scraper.createTab (queue [index++])
						.then (function (tab) {
							return Q.all ([
								scraper.exec ('links', tab)
									.then (function (links) {
										_.each (links, function (link) {
											if (queue.indexOf (link) === -1) {
												queue.push (link);
											}
										});
									}),

								scraper.exec ('entries', tab)
									.then (function (entries) {
										_.each (entries, emitter);
									})
							])
								.then (function () {
									return scraper.closeTab (tab);
								});
						})
						.then (function () {
							var deferred = Q.defer ();
							setTimeout (deferred.resolve, 3000);
							return deferred.promise;
						})
						.then (fetch);
				};

				return fetch ();
			})

			.fin (function () {
				return scraper.closeWindow ();
			});
	};
});
