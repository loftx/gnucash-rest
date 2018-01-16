coreModule = angular.module('core', []);

coreModule.factory('api', function($timeout, $location) {
	return {
		url: '/api',
		handleErrors: function (data, status, type, redirect) {
			if (status == 400 && typeof data != 'undefined') {
				if (data.errors[0] != 'undefined') {
					// alert is a sync function and causes '$digest already in progress' if not wrapped in a timeout
					// need to define timeout
					$timeout(function(){
						alert(data.errors[0].message);
					});
				} else {
					console.log(status);
					console.log(data);
					$timeout(function(){
						alert('Unexpected error - see console for details');
					});
				}
			} else if (status == 404) {
				$timeout(function(){
					if (redirect != undefined) {
						$location.path('/' + redirect);
					}
					alert('This ' + type + ' does not exist');
				});
			} else {
				console.log(status);
				console.log(data);
				$timeout(function(){
					alert('Unexpected error - see console for details');
				});
			}
		}
	}
});