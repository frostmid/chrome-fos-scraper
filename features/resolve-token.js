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
									return scraper.exec ('authorize', tab);
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
				return scraper.exec ('resolve-token', tab, {
					'disable-redirect': true
				});
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