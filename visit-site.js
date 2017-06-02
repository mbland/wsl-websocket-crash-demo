'use strict'

var page = require('webpage').create()

page.onLoadFinished = function(status) {
  console.log('STATUS:', status)
  console.log(page.content || 'NO CONTENT')
  phantom.exit(status === 'success' ? 0 : 1)
}
page.open('http://127.0.0.1:8080')
