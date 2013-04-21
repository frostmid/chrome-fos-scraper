define (['libs/q', 'libs/events', 'libs/underscore'], function (Q, events) {
	function Slave () {
		this.features = {};

		this.emit = _.bind (this.emit, this);
	};

	_.extend (Slave.prototype, events.EventEmitter.prototype, {
		settings: null,
		socket: null,
		features: null,
		currentStatus: 'free',
		retry: 1000,

		_error: function (error) {
			console.error ('Error', error);
		},

		connect: function (io, url) {
			if (this.socket) {
				throw new Error ('Already connected');
			}
			
			console.log ('Connecting to master', url);

			(this.socket = io.connect (url, {
				'try multiple transports': false,
				'reconnect': true,
				'max reconnection attempts': Infinity,
				'sync disconnect on unload': true
			}))
				.on ('connect', _.bind (this.connected, this))
				.on ('disconnect', _.bind (this.disconnected, this))
				.on ('error', _.bind (this.error, this))
				.on ('task', _.bind (this.handle, this));

			return this;
		},

		error: function (error) {
			this.socket = null;
			this._error.call (this, error);
		},

		fail: function (callback) {
			this._error = callback;

			return this;
		},

		connected: function () {
			console.log ('Connected, waiting for tasks');
			this.syncSettings ();
		},

		disconnected: function (error) {
			console.error ('Disconnected from master');
			this.socket = null;
		},

		disconnect: function () {
			if (this.socket) {
				this.socket.disconnect ();
				this.socket = null;
			}
		},

		syncSettings: function () {
			if (this.socket) {
				this.socket.emit ('settings', {
					features: _.keys (this.features),
					status: this.currentStatus
				});
			}
		},

		status: function (status) {
			this.currentStatus = status;
			this.syncSettings ();

			return this;
		},

		use: function (feature, callback) {
			this.features [feature] = callback;

			return this;
		},

		handle: function (task) {
			console.log ('Processing task', task._id);
			
			var self = this;

			Q.when (this.feature (task.feature))
				.then (function (callback) {
					return Q.when (callback.call (self, task));
				})

				.then (_.bind (function (result) {
					console.log ('Task completed', task._id);
					
					this.socket.emit (task._id, {
						status: 'ready'
					});
				}, this))

				.fail (_.bind (function (error) {
					console.log ('Task failed', task._id, error);

					this.socket.emit (task._id, {
						error: error.message || error
					});
				}, this))

				.done ();
		},

		feature: function (feature) {
			var callback = this.features [feature];

			switch (typeof callback) {
				case 'function':
					return callback;

				case 'undefined':
					throw new Error ('Callback not found for feature ' + feature);

				default:
					throw new Error ('Callback for feature ' + feature + ' is not a function');
			}
		},

		emitter: function (task) {
			return _.bind (function (entry) {
				this.socket.emit (task._id, {
					entry: entry
				});
			}, this);
		}
	});

	return Slave;
});
