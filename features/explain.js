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
				return scraper.createTab (task.url);
			})

			.then (function (tab) {
				return scraper.exec ('explain', tab)
					.then (emitter)
					.fin (function () {
						return scraper.closeTab (tab);
					});
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