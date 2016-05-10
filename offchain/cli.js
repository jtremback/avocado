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

console.log(avocadoProvider + '/' + argv._[0], JSON.stringify(argv,null,2))

post(avocadoProvider + '/' + argv._[0], argv, function (err, res, body) {
  console.log(err || '', body)
})

function post(url, body, callback) {
  request.post({
    url,
    body,
    json: true,
  }, callback)
}
