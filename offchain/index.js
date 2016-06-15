// cli options
// -c caller port
// -p peer port
// -s contract address
// -f storage location
// -w web3 provider

import minimist from 'minimist'
import path from 'path'
import request from 'request'
import p from 'es6-promisify'
import Web3 from 'web3'

const PUDDING_PATH = path.resolve(__dirname + '/../pudding/')

const argv = minimist(process.argv.slice(2))
const peerPort = argv.p || 4020
const callerPort = argv.c || 3020
// TODO contractAddress not used
// const contractAddress = argv.s || '0xf8c138b08cb32391C7Ab8Edbda61E023943f72d7'
const storageLocation = argv.f || path.join(__dirname, '../data/storage')
const web3Provider = argv.w || 'http://localhost:8545'


;(async () => {
  // MAKE WEB3
  const web3 = new Web3()
  web3.setProvider(new Web3.providers.HttpProvider(web3Provider))
  const accounts = await p(web3.eth.getAccounts)()
  web3.eth.defaultAccount = accounts[0]


  // INSTANTIATE PUDDING CONTRACT ABSTRACTION
  const StateChannels = require(PUDDING_PATH + '/StateChannels.sol.js')
  StateChannels.setProvider(new Web3.providers.HttpProvider(web3Provider))
  const contract = await StateChannels.new()

  var JSONStorage = require('node-localstorage').JSONStorage
  var storage = new JSONStorage(storageLocation)

  const post = p(function (url, body, callback) {
    request.post({
      url,
      body,
      json: true,
    }, callback)
  })

  var globals = {
    storage,
    contract,
    web3,
    post
  }

  var caller = require('./servers/caller.js').default(globals)
  var peer = require('./servers/peer.js').default(globals)

  peer.listen(peerPort, () => console.log('peer api listening on ' + peerPort))
  caller.listen(callerPort, () => console.log('caller api listening on ' + callerPort))
})().catch(err => console.error(err))
