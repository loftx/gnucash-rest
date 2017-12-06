#!/usr/bin/python
import sys
import logging

# Log to stderr?
logging.basicConfig(stream=sys.stderr)

# Set working directory so the gnucash_rest module can be found
sys.path.insert(0,"/var/www/gnucash-rest")

# Load application via 
from gnucash_rest import app as application

# Set variables
application.connection_string = '/home/wsgi/gnucash.gnucash'

