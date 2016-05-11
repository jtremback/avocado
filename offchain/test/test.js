export async function test (alice, bob) {
  await alice.proposeChannel({
    myAccount: 0,
    counterpartyAccount: 1,
    counterpartyUrl: 'bob',
    channelId: '0x1000000000000000000000000000000000000000000000000000000000000000',
    state: '0x11',
    challengePeriod: 1
  })
}