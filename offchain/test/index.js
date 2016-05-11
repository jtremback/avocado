require('babel-register')
require('babel-polyfill')

var Logic = require('../logic.js').Logic
var Web3 = require('web3')
var Pudding = require('ether-pudding')
var TestRPC = require('ethereumjs-testrpc')
var promisify = require('es6-promisify')
var postFactory = require('./post-factory.js').postFactory
var test = require('./test.js').test

var web3 = new Web3()
web3.setProvider(TestRPC.provider())
Pudding.setWeb3(web3)

var StateChannels = require('../../environments/test/contracts/StateChannels.sol.js')
StateChannels.load(Pudding)
var channels = StateChannels.deployed()

class FakeStorage {
  constructor (obj) {
    this.obj = obj || {}
  }
  
  getItem(key) {
    return this.obj[key]
  }
  
  setItem(key, item) {
    this.obj[key] = item
  }
}

var calls = {
  '/add_proposed_channel': 'addProposedChannel',
  '/add_proposed_update': 'addProposedUpdate',
  '/add_accepted_update': 'addAcceptedUpdate',
}

var alice = new Logic({
  storage: new FakeStorage(),
  channels,
  web3,
})

var bob = new Logic({
  storage: new FakeStorage(),
  channels,
  web3,
})


alice.post = postFactory({alice, bob}, calls)
bob.post = postFactory({alice, bob}, calls)

test(alice, bob).then(result => {
  console.log('Result:', result)
}).catch(error => {
  console.log('Error:', error)
}) 