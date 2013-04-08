#!/usr/bin/python

import gnucash
import gnucash_simple
import json
import atexit
from flask import Flask, abort, request
import sys
import getopt

app = Flask(__name__)
app.debug = True

QOF_COMPARE_LT = 1
QOF_COMPARE_LTE = 2
QOF_COMPARE_EQUAL = 3
QOF_COMPARE_GT = 4
QOF_COMPARE_GTE = 5
QOF_COMPARE_NEQ = 6

@app.route('/accounts')
def api_accounts():

	accounts = getAccounts(session.book)

	return accounts

@app.route('/accounts/<guid>')
def api_account(guid):

	account = getAccount(session.book, guid)
	
	if account is None:
		abort(404)
	else:
		return account 

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

def getAccounts(book):

	accounts = gnucash_simple.accountToDict(book.get_root_account())

	return json.dumps(accounts)

def getAccount(book, guid):

	account_guid = gnucash.gnucash_core.GUID() 
	GUIDString(guid, account_guid)

	account = gnucash_simple.accountToDict(account_guid.AccountLookup(book))

	if account is None:
		return None
	else:
		return json.dumps(account)

def getAccountSplits(book, guid):

	# working on this though split off to make getAccount work
	#check account exists (?)
	account_guid = gnucash.gnucash_core.GUID() 
	GUIDString(guid, account_guid)

	#account = gnucash_simple.accountToDict(account_guid.AccountLookup(book))

	print account_guid.AccountLookup(book).GetSplitList()

	'''for split in split_list:
        if type(split) != Split:
              split = Split(instance=split)
        transaction=split.GetParent()
        if not (transaction in transaction_list):       # this check may not be necessary.
          transaction_list.append(transaction)
    print transaction_list'''

	#return json.dumps(account)

def getAccountTransactions(book, guid):

	# working on this though split off to make getAccount work
	#check account exists (?)
	account_guid = gnucash.gnucash_core.GUID() 
	GUIDString(guid, account_guid)

	transaction_list = []

	for split in account_guid.AccountLookup(book).GetSplitList():
		if type(split) != gnucash.gnucash_core.Split:
			split = gnucash.gnucash_core.Split(instance=split)
		transaction=split.GetParent()
		if not (transaction in transaction_list):       # this check may not be necessary.
			transaction_list.append(transaction)

	for transaction in transaction_list:
		print gnucash_simple.transactionToDict(transaction)

	#print transaction_list

	#return json.dumps(account)


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

	## define addition methods for GUID object
	gnucash.gnucash_core.GUID.add_method('guid_to_string', 'to_string')
	gnucash.gnucash_core.GUID.add_method('string_to_guid', 'string_to_guid')

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

class GUIDString(gnucash.gnucash_core.GnuCashCoreClass):
    pass

GUIDString.add_constructor_and_methods_with_prefix('string_', 'to_guid')  

addMethods()

try:
	options, arguments = getopt.getopt(sys.argv[1:], 'h:', ['host='])
except getopt.GetoptError as err:
	print str(err) # will print something like "option -a not recognized"
	print 'Usage: python-rest.py <connection string>'
	sys.exit(2)

if len(arguments) != 1:
	print 'Usage: python-rest.py <connection string>'
	sys.exit(2)

#set default host for flash
host = '127.0.0.1'

#allow host option to be changed
for option, value in options:
	if option in ("-h", "--host"):
		host = value

#start gnucash session base on connection string argument
session = gnucash.Session(arguments[0], ignore_lock=True)

# register method to close gnucash connection gracefully
atexit.register(shutdown)

# start flash server
app.run(host=host)

