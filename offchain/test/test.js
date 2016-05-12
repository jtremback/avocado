import assert from 'assert'

export async function test (alice, bob) {
  const idOne = '0x0000000000000000000000000000000000000000000000000000000000000001'
  
  await alice.proposeChannel({
    myAccount: 0,
    counterpartyAccount: 1,
    counterpartyUrl: 'bob',
    myUrl: 'bob',
    channelId: idOne,
    state: '0x11',
    challengePeriod: 1
  })
  
  await bob.acceptProposedChannel(idOne)
  
  await alice.proposeUpdate({
    channelId: idOne,
    state: '0x3333'
  })
  
  console.log(bob.fakeStore.channels[idOne])
  
  await bob.proposeUpdate({
    channelId: idOne,
    state: '0x4444'
  })
}
