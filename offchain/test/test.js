import test from 'tape-async'
import setup from './setup.js'

const idOne = '0x0000000000000000000000000000000000000000000000000000000000000001'

test('create channel', async t => {
  const {alice, bob} = await setup()
  await alice.proposeChannel({
    myAccount: 0,
    counterpartyAccount: 1,
    counterpartyUrl: 'bob',
    myUrl: 'bob',
    channelId: idOne,
    state: '0x11',
    challengePeriod: 1
  })
  
  console.log(alice.fakeStore.channels[idOne])
  
  t.end()
})

// test('this test will successfully pass', async (t) => {
//     t.equal(await doSomethingAsync(), 'async!')
//     t.equal(true, true)
//     t.end();
// });

// test('this tet will successfully pass', async (t) => {
//   t.equal(true, true)
//   t.end()
// });


// async function doSomethingAsync() {
//   throw new Error('shimw')
//   return 'async!'
// }

// async function throwSomethingAsync() {
//   throw new Error('boom')
// }

// test('#doSomethingAsync', async t => {
//   try {
//     t.equal(await doSomethingAsync(), 'async!')
//     t.equal(await doSomethingAsync(), 'async!')
//     t.equal(await doSomethingAsync(), 'async!')
//     t.equal(await doSomethingAsync(), 'async!')
    // t.equal(await doSomethingAsync(), 'async!')
    // t.end();
//   } catch (err) {
//     t.error(err)
//   }
//   t.end();
// });


// test('#throwSomethingAsync', async t => {
//   try {
//     await throwSomethingAsync();
//   } catch(err) {
//     t.equal(err.message, 'boom');
//   }
//   t.end();
// });

// testAsync(async t => {
//   throw new Error('crunklington')
//   t.equal(true, true)
// })

// async function testAsync(fn) {
//   return async (t) => {
//     try {
//       await fn(t)
//     } catch (err) {
//       t.error(err)
//     }
//   }
// }


// console.log('shibby')

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
