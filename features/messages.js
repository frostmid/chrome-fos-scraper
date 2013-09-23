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
										return _.map (
											_.filter (entries, function (entry) {
												return (entry.created_at * 1000) >= task ['scrape-start'];
											}),
											emitter);
									})
							])
								.then (function () {
									return scraper.closeTab (tab);
								})
								.fail (function (error) {
									console.error ('#error', error);
									return scraper.closeTab (tab);
								})

								.then (function (value) {
									var deferred = Q.defer ();
									setTimeout (function () {
										deferred.resolve (value);
									}, 750);
									return deferred.promise;
								})
								.fail (function (error) {
									console.error ('fetch failed', error);
								})
								.then (fetch);
						});
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
