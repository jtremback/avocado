// cli options
// -c caller port
// -p peer port
// -s contract address
// -f storage location
let argv = require('minimist')(process.argv.slice(2))

const peerPort = argv.c || 4020
const callerPort = argv.p || 3020
const contractAddress = argv.s || '0x3939'
const storageLocation = argv.f || '../data/storage'

require('babel-register')
require('babel-polyfill')

const Web3 = require('web3')
const web3 = new Web3()
const Pudding = require('ether-pudding')
Pudding.setWeb3(web3)

web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'));

const StateChannels = require('../environments/test/contracts/StateChannels.sol.js')
StateChannels.load(Pudding)
const channels = StateChannels.at(contractAddress)

const { JSONStorage } = require('node-localstorage')
const storage = new JSONStorage(storageLocation)

const globals = {
  storage,
  channels,
  web3
}

const caller = require('./servers/caller.js').default(globals)
const peer = require('./servers/peer.js').default(globals)

peer.listen(peerPort, () => console.log('peer api listening on ' + peerPort))
caller.listen(callerPort, () => console.log('caller api listening on ' + callerPort))