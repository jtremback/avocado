require('babel-register')
require('babel-polyfill')

const Web3 = require('web3')
const web3 = new Web3()
const Pudding = require('ether-pudding')
Pudding.setWeb3(web3)

var TestRPC = require('ethereumjs-testrpc')
web3.setProvider(TestRPC.provider())

const StateChannels = require('../environments/test/contracts/StateChannels.sol.js')
StateChannels.load(Pudding)
const channels = StateChannels.deployed()

const { JSONStorage } = require('node-localstorage')


const aliceStorage = new JSONStorage('./alice-storage')
const bobStorage = new JSONStorage('./bob-storage')

const globals = {
  storage,
  channels,
  web3
}

const caller = require('./servers/caller.js').default(globals)
const peer = require('./servers/peer.js').default(globals)

peer.listen(peerPort, () => console.log('peer api listening on ' + peerPort))
caller.listen(callerPort, () => console.log('caller api listening on ' + callerPort))