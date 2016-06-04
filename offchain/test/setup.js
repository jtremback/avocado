import { Logic } from '../logic.js'
import fs from 'fs'
import Web3 from 'web3'
import p from 'es6-promisify'
import TestRPC from 'ethereumjs-testrpc'
import solc from 'solc'

export default async function () {
  const server = TestRPC.server({
    mnemonic: 'elegant ability lawn fiscal fossil general swarm trap bind require exchange ostrich'
  })
  const bchain = await p(server.listen)(8545);

  const web3 = new Web3()
  web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'))

  const accounts = await p(web3.eth.getAccounts)()
  web3.eth.defaultAccount = accounts[0]

  const BASE_PATH = __dirname + '/../../contracts/'

  function readContract(path) {
    return fs.readFileSync(BASE_PATH + path).toString()
  }

  const input = {
    'ECVerify.sol': readContract('ECVerify.sol'),
    'StateChannels.sol': readContract('StateChannels.sol')
  }

  const output = solc.compile({ sources: input }, 1)
  const abi = JSON.parse(output.contracts['StateChannels'].interface)

  // given a fn with a callback that fires twice, skip the first cb
  function skipCb(fn, ...args) {
    var count = 0
    return function(cb) {
      fn(...args, function(err, data) {
        if (err) { cb(err) }
        if (++count > 1) { cb(null, data) }
      })
    }
  }

  var StateChannels = web3.eth.contract(abi)

  const contract = await p(skipCb(StateChannels.new.bind(StateChannels), {}))()

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

  function fakePostFactory (apis, calls, myUrl) {
    return async function post (url, body) {
      const [ who, method ] = url.split('/')

      try {
        return await apis[who][calls['/' + method]](body, myUrl)
      } catch (error) {
        console.log(error)
        return { error: error.message }
      }
    }
  }

  const alice = new Logic({
    storage: fakeStorageFactory(aliceFakeStore),
    contract,
    web3,
  })

  const bob = new Logic({
    storage: fakeStorageFactory(bobFakeStore),
    contract,
    web3,
  })

  alice.fakeStore = aliceFakeStore
  bob.fakeStore = bobFakeStore

  alice.post = fakePostFactory({alice, bob}, calls, 'alice')
  bob.post = fakePostFactory({alice, bob}, calls, 'bob')

  return { alice, bob, accounts, web3 }
}
