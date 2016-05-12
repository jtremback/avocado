import test from 'tape-async'
import setup from './setup.js'

const idOne = '0x0000000000000000000000000000000000000000000000000000000000000001'

test('create channel', async t => {
  const {alice, bob} = await setup()
  await alice.proposeChannel({
    myAddress: alice.web3.eth.accounts[0],
    counterpartyAddress: bob.web3.eth.accounts[1],
    counterpartyUrl: 'bob',
    myUrl: 'bob',
    channelId: idOne,
    state: '0x11',
    challengePeriod: 1
  })
  
  console.log(alice.fakeStore.channels[idOne])
  
  await bob.acceptProposedChannel(idOne)
  
  console.log(bob.fakeStore.channels[idOne])
  
  t.end()
})

// export async function test (alice, bob) {
//   const idOne = '0x0000000000000000000000000000000000000000000000000000000000000001'
  
//   await alice.proposeChannel({
//     myAccount: 0,
//     counterpartyAccount: 1,
//     counterpartyUrl: 'bob',
//     myUrl: 'bob',
//     channelId: idOne,
//     state: '0x11',
//     challengePeriod: 1
//   })
  
//   await bob.acceptProposedChannel(idOne)
  
//   await alice.proposeUpdate({
//     channelId: idOne,
//     state: '0x3333'
//   })
  
//   console.log(bob.fakeStore.channels[idOne])
  
//   await bob.proposeUpdate({
//     channelId: idOne,
//     state: '0x4444'
//   })
// }

// function mochaAsync(fn) {
//   return async (done) => {
//     try {
//       await fn()
//       done()
//     } catch (err) {
//       done(err)
//     }
//   }
// }

// function tapeAsync(fn) {
//   return async (t) => {
//     try {
//       await fn()
//       t.end()
//     } catch (err) {
//       t.error(err)
//       t.end()
//     }
//   }
// }
