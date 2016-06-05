import test from 'blue-tape'
import setup from './setup.js'
import p from 'es6-promisify'
import bn2s from 'bignumber-to-string'


test('happy path', async t => {
  const idOne = '0x0000000000000000000000000000000000000000000000000000000000000001'
  const snapshots = {}
  const {alice, bob, accounts, web3} = await setup()

  snapshots.clean = await p(snapshot)(web3.currentProvider)

  test('create channel', async t => {
    console.log(1)
    await alice.proposeChannel({
      myAddress: accounts[0],
      counterpartyAddress: accounts[1],
      counterpartyUrl: 'bob',
      myUrl: 'bob',
      channelId: idOne,
      state: '0x11',
      challengePeriod: 1
    })

    console.log(2)
    await bob.acceptProposedChannel(idOne)
    t.deepEqual(bn2s(await bob.getBlockchainChannel(idOne)), {
      address0:'0x7d3f760e02168e26b33029d72951f2116f42720f',
      address1:'0xbd926d9a9b6ee60f79a12f051d224a1bcba6070a',
      challengePeriod:'1',
      closingBlock:'0',
      phase:'0',
      sequenceNumber:'0',
      state:'0x11'
    })
  })

  test('update channel', async t => {
    await alice.proposeUpdate({
      channelId: idOne,
      state: '0x3333'
    })

    await bob.acceptLastUpdate(idOne)

    const expectedUpdate = {
      channelId: '0x0000000000000000000000000000000000000000000000000000000000000001',
      sequenceNumber: 1,
      state: '0x3333',
      signature0: '0xb834aee7dec23070a03a202ab74c44f7f38dccd688059c4982981ca9ffdca1c732666f9c17f914f65602e0e5097c7f8f338bf7d62551e0c92b3eaa8033c284391b',
      signature1: '0xe588a2561d213c106d7fa7defc81280b87f8fddd2812e77d68f62aab079dbca228e87a59b617e93623ab34cfa2c1b6eabf83d98fa176b3086d26cfdcfd2f945a1b'
    }

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

  test('post update to blockchain', async t => {
    await alice.postLastUpdate(idOne)

    t.deepEqual(bn2s(await alice.getBlockchainChannel(idOne)), {
      address0:'0x7d3f760e02168e26b33029d72951f2116f42720f',
      address1:'0xbd926d9a9b6ee60f79a12f051d224a1bcba6070a',
      challengePeriod: '1',
      closingBlock: '0',
      phase: '0',
      sequenceNumber: '1',
      state: '0x3333'
    })
  })

  test('start challenge period', async t => {
    await alice.startChallengePeriod(idOne)
    t.deepEqual(bn2s(await alice.getBlockchainChannel(idOne)), {
      address0:'0x7d3f760e02168e26b33029d72951f2116f42720f',
      address1:'0xbd926d9a9b6ee60f79a12f051d224a1bcba6070a',
      phase: '1',
      challengePeriod: '1',
      closingBlock: String((await p(web3.eth.getBlock)('latest')).number + 1),
      state: '0x3333',
      sequenceNumber: '1'
    })
  })

  test('try close', async t => {
    await alice.tryClose(idOne) // Do it twice to advance blockchain state
    await alice.tryClose(idOne)
    t.equal(bn2s(await alice.getBlockchainChannel(idOne)).phase, '2')
  })

  test('exit', t => {
    t.end()
    process.exit(0)
  })
})

function snapshot(provider, callback) {
  provider.sendAsync({
    method: 'evm_snapshot',
    params: [],
    jsonrpc: '2.0',
    id: new Date().getTime()
  }, callback)
}

function revert(provider, id, callback) {
  provider.sendAsync({
    method: 'evm_revert',
    params: [id],
    jsonrpc: '2.0',
    id: new Date().getTime()
  }, callback)
}
