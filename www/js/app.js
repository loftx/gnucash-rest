angular.module('gnucash', [
	'core',
	'core.account', // this could be more modular https://docs.angularjs.org/tutorial/step_13 e.g. app/phone-detail/phone-detail.module.js / app/phone-detail/phone-detail.component.js:
	'core.invoice',
	'core.bill',
	'core.customer',
	'core.vendor'
]).
config(['$routeProvider', function($routeProvider) {
	$routeProvider.
		when('/accounts', {
			templateUrl: 'partials/accounts/index.html',
			controller: AccountListCtrl
		}).
		when('/accounts/:accountGuid', {
			templateUrl: 'partials/accounts/detail.html',
			controller: AccountDetailCtrl
		}).
		when('/customers', {
			templateUrl: 'partials/customers/index.html',
			controller: CustomerListCtrl
		}).
		when('/customers/:customerId', {
			templateUrl: 'partials/customers/detail.html',
			controller: CustomerDetailCtrl
		}).
		when('/vendors', {
			templateUrl: 'partials/vendors/index.html',
			controller: VendorListCtrl
		}).
		when('/vendors/:vendorId', {
			templateUrl: 'partials/vendors/detail.html',
			controller: VendorDetailCtrl
		}).
		when('/invoices', {
			templateUrl: 'partials/invoices/index.html',
			controller: InvoiceListCtrl
		}).
		when('/invoices/:invoiceId', {
			templateUrl: 'partials/invoices/detail.html',
			controller: InvoiceDetailCtrl
		}).
		when('/bills', {
			templateUrl: 'partials/bills/index.html',
			controller: BillListCtrl
		}).
		when('/bills/:billId', {
			templateUrl: 'partials/bills/detail.html',
			controller: BillDetailCtrl
		}).
		when('/reports', {
			templateUrl: 'partials/reports/index.html'
		}).
		when('/reports/income-statement', {
			templateUrl: 'partials/reports/income-statement.html',
			controller: ReportIncomeStatementCtrl
		}).
		otherwise({redirectTo: '/accounts'});
}]);