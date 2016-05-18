import test from 'blue-tape'
import setup from './setup.js'
import p from 'es6-promisify'
import bn2s from 'bignumber-to-string'


test('setup', async t => {
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
  })
  
  test('accept channel', async t => {
    await bob.acceptProposedChannel(idOne)
    t.deepEqual(bn2s(await bob.getChannel(idOne)), [ '0x5c44c7de2dc4177d94d831e213fc7c17e8a4d0d8',
  '0x314092f83a2a3be9b04d6fd1e9c4ecd8caae32ff',
  '0',
  '1',
  '0',
  '0x11',
  '0' ])
  })

  test('update channel', async t => {
    await alice.proposeUpdate({
      channelId: idOne,
      state: '0x3333'
    })
  })
})

function snapshot (provider, callback) {
  provider.sendAsync({
    method: 'evm_snapshot',
    params: [],
    jsonrpc: '2.0',
    id: new Date().getTime()
  }, callback)
}

function revert (provider, id, callback) {
  provider.sendAsync({
    method: 'evm_revert',
    params: [id],
    jsonrpc: '2.0',
    id: new Date().getTime()
  }, callback)
}
