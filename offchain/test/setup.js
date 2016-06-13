import setup from '../../setup'
import { Logic } from '../logic.js'

export default async () => {

  let { web3, contract, accounts } = await setup()

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

      body.counterpartyUrl = myUrl

      try {
        return await apis[who][calls['/' + method]](body)
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
