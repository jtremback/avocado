import { Logic } from '../logic.js'
import fs from 'fs'
import Web3 from 'web3'
import Pudding from 'ether-pudding'
import p from 'es6-promisify'
import TestRPC from 'ethereumjs-testrpc'
import solc from 'solc'

export default async function () {
  const server = TestRPC.server({
    mnemonic: 'elegant ability lawn fiscal fossil general swarm trap bind require exchange ostrich'
  })
  const bchain = await p(server.listen)(8545);
  
  const web3 = new Web3()
  const provider = new Web3.providers.HttpProvider('http://localhost:8545')
  web3.setProvider(provider)
  
  const accounts = await p(web3.eth.getAccounts)()
  web3.eth.defaultAccount = accounts[0]
  
  // Ameen's compilation code
  const BASE_PATH = __dirname + '/../../contracts/'

  function readContract(path) {
    return fs.readFileSync(BASE_PATH + path).toString()
  }

  const input = {
    'ECVerify.sol': readContract('ECVerify.sol'),
    'StateChannels.sol': readContract('StateChannels.sol')
  }

  const output = solc.compile({ sources: input }, 1)
  if (output.errors) { throw new Error(output.errors) }

  // Pudding

  await Pudding.save({
    abi: JSON.parse(output.contracts['StateChannels'].interface),
    binary: output.contracts['StateChannels'].bytecode
  }, BASE_PATH + './MyContract.sol.js')
  
  // We just save it and then require it. Nice.
  
  const StateChannels = require(BASE_PATH + './MyContract.sol.js')
  StateChannels.setProvider(provider)
  // StateChannels.load(Pudding)
  const contract = await StateChannels.new()

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
