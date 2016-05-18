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
    await alice.proposeChannel({
      myAddress: accounts[0],
      counterpartyAddress: accounts[1],
      counterpartyUrl: 'bob',
      myUrl: 'bob',
      channelId: idOne,
      state: '0x11',
      challengePeriod: 1
    })

    await bob.acceptProposedChannel(idOne)
    t.deepEqual(bn2s(await bob.getChannel(idOne)), {
      address0: '0x5c44c7de2dc4177d94d831e213fc7c17e8a4d0d8',
      address1: '0x314092f83a2a3be9b04d6fd1e9c4ecd8caae32ff',
      challengePeriod: '1',
      closingBlock: '0',
      phase: '0',
      sequenceNumber: '0',
      state: '0x11'
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
      signature0: '0x31d775d3c48d650fe1e015b7462f5273e97a653dbfd326bea8467bd2a490e6363c08c836c762062964928d9c7a6d4c432eacc8c1b02a62b5d432697dab43b92a1b',
      signature1: '0x8f1064162fbea3da3b8396de5bef1fb31d91436db68b28bd4f55312a9b93049e66949cf273061fa23fa330c851a6189f2556ec8346a69c37b5ecc20a281297c61c'
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
    
    t.deepEqual(bn2s(await alice.getChannel(idOne)), {
      address0: '0x5c44c7de2dc4177d94d831e213fc7c17e8a4d0d8',
      address1: '0x314092f83a2a3be9b04d6fd1e9c4ecd8caae32ff',
      challengePeriod: '1',
      closingBlock: '0',
      phase: '0',
      sequenceNumber: '1',
      state: '0x3333'
    })
  })
  
  test('start challenge period', async t => {
    await alice.startChallengePeriod(idOne)
    t.deepEqual(bn2s(await alice.getChannel(idOne)), {
      address0: '0x5c44c7de2dc4177d94d831e213fc7c17e8a4d0d8',
      address1: '0x314092f83a2a3be9b04d6fd1e9c4ecd8caae32ff',
      phase: '1',
      challengePeriod: '1',
      closingBlock: String((await p(web3.eth.getBlock)('latest')).number + 1),
      state: '0x3333',
      sequenceNumber: '1'
    })
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
