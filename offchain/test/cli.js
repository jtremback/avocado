import test from 'blue-tape'
import setup from '../../setup.js'
import p from 'es6-promisify'
import { exec } from 'child_process'
import path from 'path'
import request from 'request'
import bn2s from 'bignumber-to-string'

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
  const peerUrl = `http://localhost:${peerPort}`
  const callerUrl = `http://localhost:${callerPort}`
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
    await p(exec)(`${command} propose_channel --myAddress ${accounts[0]} --counterpartyAddress ${accounts[1]} --myUrl ${callerUrl} --counterpartyUrl ${peerUrl} --channelId ${idOne} --state 0x11 --challengePeriod 1`)

    await p(exec)(`${command} accept_proposed_channel -a ${peerUrl} --channelId ${idOne}`)

    let output = await p(exec)(`${command} get_blockchain_channel -a ${peerUrl} --channelId ${idOne}`)

    t.deepEqual(bn2s(parseOutput(output)), {
      address0:'0x7d3f760e02168e26b33029d72951f2116f42720f',
      address1:'0xbd926d9a9b6ee60f79a12f051d224a1bcba6070a',
      challengePeriod:'1',
      closingBlock:'0',
      phase:'0',
      sequenceNumber:'0',
      state:'0x11'
    })
  })

  /*
  test('update channel', async t => {
    await p(exec)(`${command} propose_update --channelId ${idOne} --state 0x3333`)

    await p(exec)(`${command} accept_last_update -a ${peerUrl} --channelId ${idOne}`)

    const expectedUpdate = {
      channelId: '0x0000000000000000000000000000000000000000000000000000000000000001',
      counterpartyUrl: peerUrl,
      sequenceNumber: 1,
      state: '0x3333',
      signature0: '0xb834aee7dec23070a03a202ab74c44f7f38dccd688059c4982981ca9ffdca1c732666f9c17f914f65602e0e5097c7f8f338bf7d62551e0c92b3eaa8033c284391b',
      signature1: '0xe588a2561d213c106d7fa7defc81280b87f8fddd2812e77d68f62aab079dbca228e87a59b617e93623ab34cfa2c1b6eabf83d98fa176b3086d26cfdcfd2f945a1b'
    }

    // need to check that both servers updated their internal state...
    // this is redundant with offchain tests
    //
    // maybe just check that the contract channel is updated?
    // don't I have access to the storage object?

    console.log(storage)

    t.deepEqual(
      bob.fakeStore.channels[idOne].acceptedUpdates[0],
      expectedUpdate
    )
    t.deepEqual(
      alice.fakeStore.channels[idOne].acceptedUpdates[0],
      expectedUpdate
    )
    t.deepEqual(
      bob.fakeStore.channels[idOne].theirProposedUpdates[0],
      expectedUpdate
    )
    t.deepEqual(
      alice.fakeStore.channels[idOne].myProposedUpdates[0],
      expectedUpdate
    )
  })
  */


  test('exit', t => {
    t.end()
    process.exit(0)
  })
})

/* The output of the exec looks like this:
 *
  Request:
  http://localhost:4020/get_blockchain_channel {
   "_": [
     "get_blockchain_channel"
   ],
   "a": "http://localhost:4020",
   "channelId": "0x0000000000000000000000000000000000000000000000000000000000000001"
 }

 Response:

 *~*
 {"address0":"0x7d3f760e02168e26b33029d72951f2116f42720f","address1":"0xbd926d9a9b6ee60f79a12f051d224a1bcba6070a","phase":"0","challengePeriod":"1","closingBlock":"0","state":"0x11","sequenceNumber":"0"}
 *~*
 *
 * We want to parse the response, which is wrapped in \n*~*\n
 *
 */
function parseOutput(output) {
  let response = output.split('\n*~*\n')
  return JSON.parse(response[1])
}
