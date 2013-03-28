import gnucash
import gnucash_simple
import json
from flask import Flask, url_for

app = Flask(__name__)

@app.route('/invoices/<invoiceid>')
def api_article(invoiceid):

	session = gnucash.Session('mysql://user:password@localhost/gnucash_test', ignore_lock=True)
	book = session.book

	return getInvoice(book, invoiceid)

def getCustomer(book, id):

	customer = book.CustomerLookupByID(id)

	if customer is None:
		return None
	else:
		return json.dumps(gnucash_simple.customerToDict(customer))

def getInvoice(book, id):

	invoice = book.InvoiceLookupByID(id)

	if invoice is None:
		return None
	else:
		#print invoiceToDict(invoice)
		return json.dumps(gnucash_simple.invoiceToDict(invoice))

if __name__ == '__main__':
    #app.run()

    # http://publish.luisrei.com/articles/flaskrest.html

	# at some point will need to resolve locked back end

	session = gnucash.Session('mysql://user:password@localhost/gnucash_test', ignore_lock=True)
	#session = gnucash.Session('mysql://user:password@localhost/gnucash_test')

	book = session.book
	
	print getCustomers(book)

	#print getCustomer(book, '000005')

	#print getInvoice(book, '000394')


