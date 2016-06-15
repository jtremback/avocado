import test from 'blue-tape'
import setup from '../../setup.js'
import p from 'es6-promisify'
import { exec } from 'child_process'
import path from 'path'
import request from 'request'

// import bn2s from 'bignumber-to-string'

// cant use the same setup. need to run index to start both the caller and peer
// servers, then hit the cli methods to propose the channel, accept the
// proposed channel, etc...

// Activate index.js
// needs testrpc to be running with the correct mnemonic
// 1. run all necessary commands in this file
// 2. get a single cli test working
// 3. see if there is a useful abstraction / refactor
// 4. get all the other cli tests working

// still need everything from setup, right?
// just ALSO need real server setup in addition, unlike the logic setup which
// fakes it...

test('happy path', async () => {

  let { web3, contract, accounts } = await setup()

  const peerPort = 4020
  const callerPort = 3020
  const storageLocation = path.join(__dirname, '../../data/storage')

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

  var caller = require('../servers/caller.js').default(globals)
  var peer = require('../servers/peer.js').default(globals)

  peer.listen(peerPort, () => console.log('peer api listening on ' + peerPort))
  caller.listen(callerPort, () => console.log('caller api listening on ' + callerPort))

  const command = 'node offchain/cli.js'
  const idOne = '0x0000000000000000000000000000000000000000000000000000000000000001'

  test('create channel', async t => {
    await p(exec)(`${command} propose_channel --myAddress ${accounts[0]} --counterpartyAddress ${accounts[1]} --myUrl http://localhost:${callerPort} --counterpartyUrl http://localhost:${peerPort} --channelId ${idOne} --state 0x11 --challengePeriod 1`)
    t.ok(true)
  })

  test('exit', t => {
    t.end()
    process.exit(0)
  })
})
