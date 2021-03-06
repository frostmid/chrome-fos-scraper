define (['libs/scraper', 'libs/q'], function (Scraper, Q) {
	return function (task) {
		var emitter = this.emitter (task),
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
								scraper.exec ('private-messages-links', tab)
									.then (function (links) {
										_.each (links, function (link) {
											if (queue.indexOf (link) === -1) {
												queue.push (link);
											}
										});
									}),

								scraper.exec ('private-messages', tab)
									.then (function (entries) {
										_.each (entries, emitter);
									})
							])
								.then (function () {
									return scraper.closeTab (tab);
								});
						})
						.then (function (value) {
							var deferred = Q.defer ();
							setTimeout (function () {
								deferred.resolve (value);
							}, 50);
							return deferred.promise;
						})
						.fail (function (error) {
							console.error ('fetch failed', error);
						})
						.then (fetch);
				};

				return fetch ();
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
