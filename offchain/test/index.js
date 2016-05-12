// require('babel-register')
// require('source-map-support').install()
// require('babel-polyfill')

export default async function () {
  var Logic = require('../logic.js').Logic
  var Web3 = require('web3')
  var Pudding = require('ether-pudding')
  var TestRPC = require('ethereumjs-testrpc')
  var promisify = require('es6-promisify')
  var postFactory = require('./post-factory.js').postFactory
  var test = require('./test.js').test

  var web3 = new Web3()
  web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'))
  web3.eth.defaultAccount = web3.eth.accounts[0]
  
  Pudding.setWeb3(web3)
  var StateChannels = require('../../environments/test/contracts/StateChannels.sol.js')
  StateChannels.load(Pudding)
  var channels = await StateChannels.new()
  // var channels = StateChannels.deployed()


  function fakeStorageFactory (obj) {
    return {
      getItem(key) {
        return obj[key]
      },
      
      setItem(key, item) {
        obj[key] = item
      }
    }
  }

  var calls = {
    '/add_proposed_channel': 'addProposedChannel',
    '/add_proposed_update': 'addProposedUpdate',
    '/add_accepted_update': 'addAcceptedUpdate',
  }

  var aliceFakeStore = {}
  var bobFakeStore = {}

  var alice = new Logic({
    storage: fakeStorageFactory(aliceFakeStore),
    channels,
    web3,
  })

  var bob = new Logic({
    storage: fakeStorageFactory(bobFakeStore),
    channels,
    web3,
  })

  alice.fakeStore = aliceFakeStore
  bob.fakeStore = bobFakeStore

  alice.post = postFactory({alice, bob}, calls)
  bob.post = postFactory({alice, bob}, calls)

  return test(alice, bob)
}
