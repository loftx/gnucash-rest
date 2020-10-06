var app = angular.module('gnucash', [
	'ngRoute',
	'ngAnimate',
	'ngStorage',
	'ui.bootstrap',
	'core',
	'core.session',
	'core.account', // this could be more modular https://docs.angularjs.org/tutorial/step_13 e.g. app/phone-detail/phone-detail.module.js / app/phone-detail/phone-detail.component.js:
	'core.invoice',
	'core.bill',
	'core.customer',
	'core.vendor',
	'core.entry',
	'core.transaction'
]);

app.config(['$routeProvider', function($routeProvider) {
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
		when('/invoices/:invoiceId/print', {
			templateUrl: 'partials/invoices/print.html',
			controller: InvoicePrintCtrl
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
		when('/session/delete', {
			templateUrl: 'partials/session/delete.html',
			controller: SessionDeleteCtrl
		}).
		otherwise({redirectTo: '/accounts'});
}]);

// restrict ngAnimate as it's required for uibModal dialogs but interrupts loading animations (http://blog.fgribreau.com/2014/03/how-to-configure-ng-animate-to-work-on.html)
app.config(['$animateProvider', function($animateProvider) {
  // restrict animation to elements with the bi-animate css class with a regexp.
  // note: "bi-*" is our css namespace at @Bringr.
  $animateProvider.classNameFilter(/bi-animate/);
}]);