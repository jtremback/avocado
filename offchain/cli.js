var argv = require('minimist')(process.argv.slice(2), {
  string: [
    'myAddress',
    'counterpartyAddress',
    'channelId',
    'state',
    'address0',
    'address1',
    'signature0',
    'signature1'
  ]
})
var avocadoProvider = argv.a || 'http://localhost:3020'
var request = require('request')

console.log('Request:\n', avocadoProvider + '/' + argv._[0], JSON.stringify(argv,null,2), '\n')

post(avocadoProvider + '/' + argv._[0], argv, function (err, res, body) {
  console.log('Response:\n', err || '', body, '\n')
})

function post(url, body, callback) {
  request.post({
    url,
    body,
    json: true,
  }, callback)
}
