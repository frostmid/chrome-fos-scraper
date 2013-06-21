define (['libs/q', 'libs/underscore'], function (Q) {
	function Scraper (task) {
		this.task = task;
		this.bridge = task._prefetch.bridge;
		this.token = task._prefetch.token;
		this.feature = task._prefetch.feature;
		this.whenTabIsReady = _.bind (this.whenTabIsReady, this);
	}

	_.extend (Scraper.prototype, {
		task: null, bridge: null, token: null, feature: null, window: null,

		tabPollingInterval: 100,

		start: function () {
			var self = this;

			return this.createWindow ({
				url: this.bridge ['base-uri'],
				incognito: true
			})
				.then (function (window) {
					self.window = window;
					return self.getFirstTab ();
				})
				.then (this.whenTabIsReady)
		},

		exec: function (key, tab, options) {
			if (!this.bridge [key]) {
				throw new Error ('Bridge #' + this.bridge + ' has no key ' + key);
			}

			return this.runInTab (tab, _.extend ({
				params: [this.task],
				source: this.bridge [key]
			}, options || {}));
		},

		createWindow: function (options) {
			var deferred = Q.defer ();

			try {
				chrome.windows.create (options, deferred.resolve);
			} catch (e) {
				deferred.reject (e);
			}

			return deferred.promise;
		},

		closeWindow: function () {
			var deferred = Q.defer ();

			try {
				chrome.windows.remove (this.window.id, deferred.resolve);
			} catch (e) {
				deferred.reject (e.message);
			}

			return deferred.promise;
		},

		createTab: function (url, window) {
			var deferred = Q.defer ();

			try {
				chrome.tabs.create ({
					windowId: this.window.id,
					url: url
				}, deferred.resolve);
			} catch (e) {
				deferred.reject (e.message);
			}

			return deferred.promise
				.then (_.bind (this.whenTabIsReady, this));
		},

		closeTab: function (tab) {
			var deferred = Q.defer ();

			try {
				chrome.tabs.remove (tab.id, deferred.resolve);
			} catch (e) {
				deferred.reject (e.message);
			}
			
			return deferred.promise;
		},

		getFirstTab: function () {
			var deferred = Q.defer ();

			try {
				chrome.tabs.getAllInWindow (this.window.id, function (tabs) {
					deferred.resolve (tabs [0]);
				});
			} catch (e) {
				deferred.reject (e);
			}
			
			return deferred.promise;
		},

		whenTabIsReady: function (tab) {
			var deferred = Q.defer (),
				id = tab.id,
				interval;

			interval = setInterval (function () {
				try {
					chrome.tabs.get (id, function (tab) {
						if (tab) {
							if (tab.status == 'complete') {
								clearInterval (interval);
								deferred.resolve (tab);
							}
						} else {
							clearInterval (interval);
							deferred.reject ('Tab #' + id + ' was closed');
						}
					});
				} catch (e) {
					clearInterval (interval);
					deferred.reject (e);
				}
			}, this.tabPollingInterval);

			return deferred.promise;
		},

		redirectTab: function (tab, url) {
			chrome.tabs.update (tab.id, {
				url: url
			});

			return Q.resolve (tab);
		},

		runInTab: function (tab, desc) {
			var deferred = Q.defer (),
				self = this;

			if (typeof desc.source == 'function') {
				desc.source = desc.source.toString ();
			}

			_.delay (function () {
				chrome.tabs.sendMessage (tab.id, desc, function (response) {
					if (!response) {
						deferred.reject ('null response from chrome tab');
					} else if (response.error) {
						deferred.reject (response.error);
					} else {
						self.whenTabIsReady (tab)
							.then (function () {
								if (typeof response.result == 'object' && response.result.redirect) {
									return self.redirectTab (tab, response.result.redirect)
										.then (function (tab) {
											return self.runInTab (tab, desc);
										})
										.then (deferred.resolve, deferred.reject);
								} else if (!desc ['disable-redirect'] && (typeof response.result == 'string') && /^https?:\/\//.test (response.result)) {
									return self.redirectTab (tab, response.result)
										.then (function (tab) {
											return self.runInTab (tab, desc);
										})
										.then (deferred.resolve, deferred.reject);
								} else {
									deferred.resolve (response.result);
								}
							})
							.fail (deferred.reject)
							.done ();
					}
				});
			}, 10);

			return deferred.promise;
		}
	});

	return Scraper;
})