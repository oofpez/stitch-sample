const request = require('request-promise')

const options = {
    method: 'OPTIONS',
    uri: 'https://api.stitch.money'
  }

request(options)
    .then(function (response) {
        // Request was successful, use the response object at will
    })
    .catch(function (err) {
        // Something bad happened, handle the error
    })