#!/usr/bin/python
import sys
import logging

# Log to stderr?
logging.basicConfig(stream=sys.stderr)

# Set python paths so the gnucash, gnucash_rest and gnucash_simple module can be found
sys.path.insert(0,"/var/www/gnucash-rest")
sys.path.insert(0,"/var/www/gnucash-rest/gnucash_rest")
sys.path.insert(0,"/usr/local/lib/python3/dist-packages")

# Load application via 
from gnucash_rest import app as application

# Set variables
#application.connection_string = '/home/wsgi/gnucash.gnucash'

