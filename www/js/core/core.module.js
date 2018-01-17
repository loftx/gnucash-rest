angular.module('core', ['core.account']);

angular.module('core').factory('api', function($timeout, $location) {
	return {

		getUrl: function () {
			if (localStorage.getItem('url') == null) {
				return '/api';
			} else {
				return localStorage.getItem('url');
			}
		},

		getHeaders: function () {
			if (localStorage.getItem('headers') == null) {
				return {};
			} else {
				return JSON.parse(localStorage.getItem('headers'));
			}
		},
		
		handleErrors: function (data, status, type, redirect) {
			if (status == 0 && data == '') {
				$timeout(function(){
					alert('Possible cross domain call - check CORS headers.');
				});
			} else if (status == 400 && typeof data != 'undefined') {
				if (data.errors[0] != 'undefined') {
					// alert is a sync function and causes '$digest already in progress' if not wrapped in a timeout
					// need to define timeout
					$timeout(function(){
						alert(data.errors[0].message);
					});
				} else {
					console.log('status: ' + status);
					console.log('data: ' + data);
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
				console.log('status: ' + status);
					console.log('data: ' + data);
				$timeout(function(){
					alert('Unexpected error - see console for details');
				});
			}
		}
	}
});