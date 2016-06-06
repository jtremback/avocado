import { Logic } from '../logic.js'
import fs from 'fs'
import Web3 from 'web3'
import Pudding from 'ether-pudding'
import p from 'es6-promisify'
import TestRPC from 'ethereumjs-testrpc'
import solc from 'solc'

const SOL_PATH = __dirname + '/../../contracts/'
const PUDDING_PATH = __dirname + '/../../pudding/'
const TESTRPC_PORT = 8545

export default async function () {
  // COMPILE AND PUDDINGIFY
  // Everything in this section could be moved into another process
  // watching ./contracts
  const input = {
    'ECVerify.sol': fs.readFileSync(SOL_PATH + 'ECVerify.sol').toString(),
    'StateChannels.sol': fs.readFileSync(SOL_PATH + 'StateChannels.sol').toString()
  }

  const output = solc.compile({ sources: input }, 1)
  if (output.errors) { throw new Error(output.errors) }

  await Pudding.save({
    abi: JSON.parse(output.contracts['StateChannels'].interface),
    binary: output.contracts['StateChannels'].bytecode
  }, PUDDING_PATH + './StateChannels.sol.js')
  


  // START TESTRPC
  await p(TestRPC.server({
    mnemonic: 'elegant ability lawn fiscal fossil general swarm trap bind require exchange ostrich'
  }).listen)(TESTRPC_PORT)



  // MAKE WEB3
  const web3 = new Web3()
  web3.setProvider(new Web3.providers.HttpProvider('http://localhost:' + TESTRPC_PORT))
  const accounts = await p(web3.eth.getAccounts)()
  web3.eth.defaultAccount = accounts[0]



  // INSTANTIATE PUDDING CONTRACT ABSTRACTION  
  const StateChannels = require(PUDDING_PATH + './StateChannels.sol.js')
  StateChannels.setProvider(new Web3.providers.HttpProvider('http://localhost:' + TESTRPC_PORT))
  const contract = await StateChannels.new()



  // SET UP AND RUN TESTS
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
