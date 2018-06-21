function SessionDeleteCtrl($scope, $location, Session) {
	
	Session.delete().then(function(session) {

		// This will show the 'The session does not exist' error on the connect box, as it currently redirects to /accounts
		$location.path('/');

	}, function(data) {
		if(typeof data.errors != 'undefined') {
			if (data.errors[0].type == 'GnuCashBackendException') {
				$scope.error = data.errors[0].message + ': ' + data.errors[0].data.code;
			} else {
				$scope.error = data.errors[0].message;
			}
		} else {
			console.log(data);	
		}
	});
}

// this is bad due to the case...
app.controller('modalStartSessionCtrl', ['error', '$scope', '$route', '$uibModalStack', '$uibModalInstance', 'Session', function(error, $scope, $route, $uibModalStack, $uibModalInstance, Session) {

	$scope.error = error;
	$scope.session = {};

	// could change to generic function
	$scope.startSession = function() {

		var params = {
			connection_string: $scope.session.connection_string,
			is_new: $scope.session.is_new ? 1 : 0,
			ignore_lock: $scope.session.ignore_lock ? 1 : 0
		};

		Session.start(params).then(function(session) {

			//use $uibModalStack.dismissAll() rather than $uibModalInstance.close() as multiple calls currently pop up dialogs which stack;
			$uibModalStack.dismissAll();
			$route.reload();

		}, function(data) {
			if(typeof data.errors != 'undefined') {
				if (data.errors[0].type == 'GnuCashBackendException') {
					$scope.error = data.errors[0].message + ': ' + data.errors[0].data.code;
				} else {
					$scope.error = data.errors[0].message;
				}
			} else {
				console.log(data);	
			}
		});

	}

}]);
