export default async function () {
  const Logic = require('../logic.js').Logic
  const Web3 = require('web3')
  const Pudding = require('ether-pudding')

  const web3 = new Web3()
  web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'))
  web3.eth.defaultAccount = web3.eth.accounts[0]
  
  Pudding.setWeb3(web3)
  const StateChannels = require('../../environments/test/contracts/StateChannels.sol.js')
  StateChannels.load(Pudding)
  const channels = await StateChannels.new()

  const aliceFakeStore = {}
  const bobFakeStore = {}

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

  const calls = {
    '/add_proposed_channel': 'addProposedChannel',
    '/add_proposed_update': 'addProposedUpdate',
    '/add_accepted_update': 'addAcceptedUpdate',
  }
  
  function fakePostFactory (logics, calls, myUrl) {
    return async function post (url, body) {
      const [ who, method ] = url.split('/')
      
      try {
        return await logics[who][calls['/' + method]](body, myUrl)
      } catch (error) {
        console.log(error)
        return { error: error.message }
      }
    }
  }

  const alice = new Logic({
    storage: fakeStorageFactory(aliceFakeStore),
    channels,
    web3,
  })

  const bob = new Logic({
    storage: fakeStorageFactory(bobFakeStore),
    channels,
    web3,
  })

  alice.fakeStore = aliceFakeStore
  bob.fakeStore = bobFakeStore

  alice.post = fakePostFactory({alice, bob}, calls, 'alice')
  bob.post = fakePostFactory({alice, bob}, calls, 'bob')

  return { alice, bob }
}
