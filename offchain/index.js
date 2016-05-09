// cli options
// -c caller port
// -p peer port
// -s contract address
// -f storage location
// -w web3 provider
var argv = require('minimist')(process.argv.slice(2))
var path = require('path')

var peerPort = argv.c || 4020
var callerPort = argv.p || 3020
var contractAddress = argv.s || '0xf8c138b08cb32391C7Ab8Edbda61E023943f72d7'
var storageLocation = argv.f || path.join(__dirname, '../data/storage')
var web3Provider = argv.w || 'http://localhost:8545'

require('babel-register')
require('babel-polyfill')

var Web3 = require('web3')
var web3 = new Web3()
var Pudding = require('ether-pudding')
Pudding.setWeb3(web3)

web3.setProvider(new Web3.providers.HttpProvider(web3Provider));

var StateChannels = require('../environments/test/contracts/StateChannels.sol.js')
StateChannels.load(Pudding)
var channels = StateChannels.deployed()
// var channels = StateChannels.at(contractAddress)

var JSONStorage = require('node-localstorage').JSONStorage
var storage = new JSONStorage(storageLocation)

var globals = {
  storage,
  channels,
  web3
}

var caller = require('./servers/caller.js').default(globals)
var peer = require('./servers/peer.js').default(globals)

peer.listen(peerPort, () => console.log('peer api listening on ' + peerPort))
caller.listen(callerPort, () => console.log('caller api listening on ' + callerPort))