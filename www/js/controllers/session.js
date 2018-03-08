// this is bad due to the case...
app.controller('modalStartSessionCtrl', ['error', '$scope', '$route', '$uibModalInstance', 'Session', function(error, $scope, $route, $uibModalInstance, Session) {

	$scope.error = error;
	$scope.session = {}

	// could change to generic function
	$scope.startSession = function() {

		var params = {
			connection_string: $scope.session.connection_string,
			is_new: $scope.session.is_new ? 1 : 0,
			ignore_lock: $scope.session.ignore_lock ? 1 : 0
		};

		Session.start(params).then(function(session) {

			$uibModalInstance.close();				
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
