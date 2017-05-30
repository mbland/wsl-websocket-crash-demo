'use strict'

var fs = require('fs')
var webpage = require('webpage')
var page = webpage.create()

page.onLoadFinished = function(status) {
  console.log('STATUS:', status)
  phantom.exit(status === 'success' ? 0 : 1)
}
page.open('http://127.0.0.1:8080')
