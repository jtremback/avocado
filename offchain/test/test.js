import test from 'blue-tape'
import setup from './setup.js'
import p from 'es6-promisify'


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
    
    snapshots.channelCreated = await p(snapshot)(web3.currentProvider)
  })  
  
  test('accept channel', async t => {
    await bob.acceptProposedChannel(idOne)
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
