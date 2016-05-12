import assert from 'assert'



export async function test (alice, bob) {
  await alice.proposeChannel({
    myAccount: 0,
    counterpartyAccount: 1,
    counterpartyUrl: 'bob',
    channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
    state: '0x11',
    challengePeriod: 1
  })
  
  await bob.acceptProposedChannel('0x1000000000000000000000000000000000000000000000000000000000000000')
  
  await alice.proposeUpdate({
    channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
    state: '0x3333'
  })
}
