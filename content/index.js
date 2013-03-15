(function () {
	var compile = function (request) {
		if (request.scope) {
			for (var i in request.scope) {
				eval ('var ' + i + ' = request.scope.' + i + ';');
			}
		}

		return eval ('(' + request.source + ')')
	};

	var execute = function (request) {
		var fun = compile (request),
			params = [$];

		if (request.params) {
			for (var i = 0; i < request.params.length; i++) {
				params.push (request.params [i]);
			}
		}

		return Q.when (
			fun.apply (null, params)
		);
	};

	chrome.extension.onMessage.addListener (
		function (request, sender, sendResponse) {
			try {
				execute (request)
					.then (function (result) {
						sendResponse ({
							result: result
						});
					})

					.fail (function (error) {
						sendResponse ({
							error: error
						});
					})

					.done ();
			} catch (e) {
				sendResponse ({
					error: e.message
				});
			}

			return true;
		}
	);

	console.log ('listening for scraper commands');
}) ();