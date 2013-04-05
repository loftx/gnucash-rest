import gnucash
import gnucash_simple
import json
import atexit
from flask import Flask, abort, request

session = gnucash.Session('mysql://user:password@192.168.0.5/gnucash_test', ignore_lock=True)

app = Flask(__name__)
app.debug = True

QOF_COMPARE_LT = 1
QOF_COMPARE_LTE = 2
QOF_COMPARE_EQUAL = 3
QOF_COMPARE_GT = 4
QOF_COMPARE_GTE = 5
QOF_COMPARE_NEQ = 6

#QOF_STRING_MATCH_NORMAL = 1,
#QOF_STRING_MATCH_CASEINSENSITIVE = 2

@app.route('/invoices')
def api_invoices():

	is_paid = request.args.get('is_paid', None)
	is_active = request.args.get('is_active', None)

	if is_paid == '1':
		is_paid = 1
	elif is_paid == '0':
		is_paid = 0
	else:
		is_paid = None

	if is_active == '1':
		is_active = 1
	elif is_active == '0':
		is_active = 0
	else:
		is_active = None

	invoices = getInvoices(session.book, is_paid, is_active)

	return invoices

@app.route('/invoices/<id>')
def api_invoice(id):

	invoice = getInvoice(session.book, id)
	
	if invoice is None:
		abort(404)
	else:
		return invoice 


@app.route('/customers')
def api_customers(): 

	customers = getCustomers(session.book)

	return customers

@app.route('/customers/<id>')
def api_customer(id):

	customer = getCustomer(session.book, id)
	
	if customer is None:
		abort(404)
	else:
		return customer 

def getCustomers(book):

	query = gnucash.Query()
	query.search_for('gncCustomer')
	query.set_book(book)
	customers = []

	for result in query.run():
		customers.append(gnucash_simple.customerToDict(gnucash.gnucash_business.Customer(instance=result)))

	query.destroy()

	return json.dumps(customers)

def getCustomer(book, id):

	customer = book.CustomerLookupByID(id)

	if customer is None:
		return None
	else:
		return json.dumps(gnucash_simple.customerToDict(customer))

def getInvoices(book, is_paid, is_active):

	query = gnucash.Query()
	query.search_for('gncInvoice')
	query.set_book(book)

	if is_paid == 0:
		query.add_boolean_match([INVOICE_IS_PAID], False, QOF_QUERY_AND)
	elif is_paid == 1:
		query.add_boolean_match([INVOICE_IS_PAID], True, QOF_QUERY_AND)

	# active = JOB_IS_ACTIVE
	if is_active == 0:
		query.add_boolean_match(['active'], False, QOF_QUERY_AND)
	elif is_active == 1:
		query.add_boolean_match(['active'], True, QOF_QUERY_AND)

	# return only invoices (1 = invoices)
	pred_data = QueryInt32Predicate(QOF_COMPARE_EQUAL, 1)
	query.add_term([INVOICE_TYPE], pred_data, QOF_QUERY_AND)

	invoices = []

	for result in query.run():
		invoices.append(gnucash_simple.invoiceToDict(gnucash.gnucash_business.Invoice(instance=result)))

	query.destroy()

	return json.dumps(invoices)

def getInvoice(book, id):

	invoice = book.InvoiceLookupByID(id)

	if invoice is None:
		return None
	else:
		#print invoiceToDict(invoice)
		return json.dumps(gnucash_simple.invoiceToDict(invoice))

def addMethods():
	# define additional methods for Query object as these are not yet available in gnucash_core
	gnucash.gnucash_core.Query.add_method('qof_query_set_book', 'set_book')
	gnucash.gnucash_core.Query.add_method('qof_query_search_for', 'search_for')
	gnucash.gnucash_core.Query.add_method('qof_query_run', 'run')
	gnucash.gnucash_core.Query.add_method('qof_query_add_term', 'add_term')
	gnucash.gnucash_core.Query.add_method('qof_query_add_boolean_match', 'add_boolean_match')
	#gnucash.gnucash_core.Query.add_method('qof_query_string_predicate', 'string_predicate')
	gnucash.gnucash_core.Query.add_method('qof_query_destroy', 'destroy')	

def shutdown():
	session.end()
	session.destroy()


#QueryPredicate

from gnucash_core_c import \
    QOF_STRING_MATCH_NORMAL, \
    QOF_STRING_MATCH_CASEINSENSITIVE

from gnucash_core_c import \
	INVOICE_TYPE 

from gnucash_core_c import \
	QOF_QUERY_AND

from gnucash_core_c import \
	INVOICE_IS_PAID

from gnucash_core_c import \
	INVOICE_TYPE

class QueryStringPredicate(gnucash.gnucash_core.GnuCashCoreClass):
    pass

QueryStringPredicate.add_constructor_and_methods_with_prefix('qof_query_', 'string_predicate')

class QueryBooleanPredicate(gnucash.gnucash_core.GnuCashCoreClass):
    pass

QueryBooleanPredicate.add_constructor_and_methods_with_prefix('qof_query_', 'boolean_predicate')

class QueryInt32Predicate(gnucash.gnucash_core.GnuCashCoreClass):
    pass

QueryInt32Predicate.add_constructor_and_methods_with_prefix('qof_query_', 'int32_predicate')

addMethods()

atexit.register(shutdown)

if __name__ == '__main__':
    app.run(host='192.168.56.101')

#print getInvoices(session.book, None)

