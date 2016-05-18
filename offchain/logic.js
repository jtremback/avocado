/*global Uint8Array*/

import leftPad from 'left-pad'
import p from 'es6-promisify'
import { Hex, Address, Bytes32 } from './types.js'
import t from 'tcomb'

function checkSuccess (res) {
  if (!res) {
    throw new Error('no response')
  }
  
  if (res.error) {
    throw '(peer error) ' + res.error
  }
  
  if (!res.success) {
    throw new Error('peer returned unexpected value')
  }
}


export class Logic {
  constructor({
    storage,
    channels,
    web3,
    post
  }) {
    this.storage = storage
    this.channels = channels
    this.web3 = web3
    this.post = post
  }
  
  
  
  // View proposed channels
  async viewProposedChannels () {
    return this.storage.getItem('proposedChannels')
  }
  
  
  
  // View one proposed channel
  async viewProposedChannel (channelId) {
    const proposedChannels = this.storage.getItem('proposedChannels')
    return proposedChannels[channelId]
  }
  
  // Get the channel from the blockchain, update the local,
  // and return it
  async getChannel (channelId) {
    Bytes32(channelId)
    const savedChannel = await this.channels.getChannel.call(
      channelId
    )
    return savedChannel
  }  
  
  // Propose a new channel and send to counterparty
  async proposeChannel (params) {
    const counterpartyUrl = t.String(params.counterpartyUrl)
    const channelId = Bytes32(params.channelId)
    const address0 = Address(params.myAddress)
    const address1 = Address(params.counterpartyAddress)
    const state = Hex(params.state)
    const challengePeriod = t.Number(params.challengePeriod)
    
    const fingerprint = this.solSha3(
      'newChannel',
      channelId,
      address0,
      address1,
      state,
      challengePeriod
    )

    const signature0 = await p(this.web3.eth.sign)(address0, fingerprint)

    checkSuccess(await this.post(counterpartyUrl + '/add_proposed_channel', {
      channelId,
      address0,
      address1,
      state,
      challengePeriod,
      signature0
    }))

    this.storeChannel({
      channelId,
      address0,
      address1,
      state,
      challengePeriod,
      signature0,
      me: 0,
      counterpartyUrl,
      theirProposedUpdates: [],
      myProposedUpdates: [],
      acceptedUpdates: []
    })
  }



  // Called by the counterparty over the http api, gets added to the
  // proposed channel list
  async addProposedChannel (channel, counterpartyUrl) {
    t.String(counterpartyUrl)
    await this.verifyChannel(channel)
    channel.counterpartyUrl = counterpartyUrl

    let proposedChannels = this.storage.getItem('proposedChannels') || {}
    proposedChannels[channel.channelId] = channel
    this.storage.setItem('proposedChannels', proposedChannels)

    return { success: true }
  }



  // Get a channel from the proposed channel list and accept it
  async acceptProposedChannel (channelId) {
    const channel = this.storage.getItem('proposedChannels')[channelId]
    
    if (!channel) {
      throw new Error('no channel with that id')
    }

    await this.acceptChannel(
      channel
    )
  }



  // Sign the opening tx and post it to the blockchain to open the channel
  async acceptChannel (channel) {
    const fingerprint = await this.verifyChannel(channel)
    const signature1 = await p(this.web3.eth.sign)(channel.address1, fingerprint)

    await this.channels.newChannel(
      channel.channelId,
      channel.address0,
      channel.address1,
      channel.state,
      channel.challengePeriod,
      channel.signature0,
      signature1
    )
    
    this.storeChannel({
      ...channel,
      me: 1,
      theirProposedUpdates: [],
      myProposedUpdates: [],
      acceptedUpdates: []
    })
  }



  // Propose an update to a channel, sign, store, and send to counterparty
  async proposeUpdate (params) {
    const channelId = Bytes32(params.channelId)
    const state = Hex(params.state)

    const channel = this.storage.getItem('channels')[channelId]
    
    if (!channel) {
      throw new Error('cannot find channel')
    }
    
    const sequenceNumber = highestProposedSequenceNumber(channel) + 1
    
    const fingerprint = this.solSha3(
      'updateState',
      channelId,
      sequenceNumber,
      state
    )
    
    const signature = await p(this.web3.eth.sign)(
      channel['address' + channel.me],
      fingerprint
    )


    const update = {
      channelId,
      sequenceNumber,
      state,
      ['signature' + channel.me]: signature
    }

    channel.myProposedUpdates.push(update)
    this.storeChannel(channel)
    
    checkSuccess(await this.post(channel.counterpartyUrl + '/add_proposed_update', update))
  }
  
  

  // Called by the counterparty over the http api, gets verified and
  // added to the proposed update list
  async addProposedUpdate (update) {
    const channel = this.storage.getItem('channels')[update.channelId]
    this.verifyUpdate({
      channel,
      update
    })
    if (update.sequenceNumber <= highestProposedSequenceNumber(channel)) {
      throw new Error('sequenceNumber too low')
    }
    
    channel.theirProposedUpdates.push(update)
    
    this.storeChannel(channel)
    
    return { success: true }
  }

  

  // Sign the update and send it back to the counterparty
  async acceptUpdate (update) {
    const channel = this.storage.getItem('channels')[update.channelId]
    
    const fingerprint = this.verifyUpdate({
      channel,
      update
    })

    const signature = await p(this.web3.eth.sign)(
      channel['address' + channel.me],
      fingerprint
    )

    update['signature' + channel.me] = signature
    
    channel.acceptedUpdates.push(update)
    
    this.storeChannel(channel)
    
    await this.post(channel.counterpartyUrl + '/add_accepted_update', update)
  }


  // Accepts last update from theirProposedUpdates 
  async acceptLastUpdate (channelId) {
    const channel = this.storage.getItem('channels')[channelId]
    const lastUpdate = channel.theirProposedUpdates[
      channel.theirProposedUpdates.length - 1
    ]
    
    this.acceptUpdate(lastUpdate)
  }
  


  // Called by the counterparty over the http api, gets verified and
  // added to the accepted update list
  async addAcceptedUpdate (update) {
    const channel = this.storage.getItem('channels')[update.channelId]
    
    this.verifyUpdate({
      channel,
      update,
      checkMySignature: true
    })

    if (update.sequenceNumber <= highestAcceptedSequenceNumber(channel)) {
      throw new Error('sequenceNumber too low')
    }
    
    channel.acceptedUpdates.push(update)
    
    this.storeChannel(channel)
  }



  // Post last accepted update to the blockchain
  async postLastUpdate (channelId) {
    Bytes32(channelId)
    
    const channels = this.storage.getItem('channels')
    const channel = channels[channelId]
    const update = channel.acceptedUpdates[channel.acceptedUpdates.length - 1]

    await this.channels.updateState(
      update.channelId,
      update.sequenceNumber,
      update.state,
      update.signature0,
      update.signature1
    )
  }



  // Start the challenge period, putting channel closing into motion
  async startChallengePeriod (channelId) {
    Bytes32(channelId)
    
    const channel = this.storage.getItem('channels' + channelId)
    const fingerprint = this.solSha3(
      'startChallengePeriod',
      channelId
    )
    
    const signature = await p(this.web3.eth.sign)(
      channel['address' + channel.me],
      fingerprint
    )
    
    await this.channels.startChallengePeriod(
      channelId,
      signature
    )
  }



  // Gets the channels list, adds the channel, saves the channels list 
  storeChannel (channel) {
    const channels = this.storage.getItem('channels') || {}
    channels[channel.channelId] = channel
    this.storage.setItem('channels', channels)
  }
  
  
  
  // This checks that the signature is valid
  async verifyChannel(channel) {
    // console.log(channel)
    // console.trace()
    const channelId = Bytes32(channel.channelId)
    const address0 = Address(channel.address0)
    const address1 = Address(channel.address1)
    const state = Hex(channel.state)
    const challengePeriod = t.Number(channel.challengePeriod)
    const signature0 = Hex(channel.signature0)

    const fingerprint = this.solSha3(
      'newChannel',
      channelId,
      address0,
      address1,
      state,
      challengePeriod
    )

    const valid = await this.channels.ecverify.call(
      fingerprint,
      signature0,
      address0
    )
    
    if (!valid) {
      throw new Error('signature0 invalid')
    }

    return fingerprint
  }



  // This checks that their signature is valid, and optionally
  // checks my signature as well
  async verifyUpdate ({channel, update, checkMySignature}) {
    const channelId = Bytes32(update.channelId)
    const state = Hex(update.state)
    const sequenceNumber = t.Number(update.sequenceNumber)
    
    t.maybe(t.Boolean)(checkMySignature)
    
    const fingerprint = this.solSha3(
      'updateState',
      channelId,
      sequenceNumber,
      state
    )

    let valid = await this.channels.ecverify.call(
      fingerprint,
      update['signature' + swap[channel.me]],
      channel['address' + swap[channel.me]]
    )

    if (!valid) {
      throw new Error('signature' + swap[channel.me] + ' invalid')
    }

    if (checkMySignature) {
      let valid = await this.channels.ecverify.call(
        fingerprint,
        update['signature' + channel.me],
        channel['address' + channel.me]
      )

      if (!valid) {
        throw new Error('signature' + channel.me + ' invalid')
      }
    }

    return fingerprint
  }



  // Polyfill to get the sha3 to work the same as in solidity
  solSha3 (...args) {
    args = args.map(arg => {
      if (typeof arg === 'string') {
        if (arg.substring(0, 2) === '0x') {
          return arg.slice(2)
        } else {
          return this.web3.toHex(arg).slice(2)
        }
      }

      if (typeof arg === 'number') {
        return leftPad((arg).toString(16), 64, 0)
      }
      
      else {
        return ''
      }
    })

    args = args.join('')

    return '0x' + this.web3.sha3(args, { encoding: 'hex' })
  }
}

const swap = [1, 0]

function highestAcceptedSequenceNumber (channel) {
  return channel.acceptedUpdates[
    channel.acceptedUpdates.length - 1
  ].sequenceNumber
}

function highestProposedSequenceNumber (channel) {
  const myHighestSequenceNumber = 
  channel.myProposedUpdates.length > 0 ?   
    channel.myProposedUpdates[
      channel.myProposedUpdates.length - 1
    ].sequenceNumber
  : 0
  
  const theirHighestSequenceNumber = 
  channel.theirProposedUpdates.length > 0 ?   
    channel.theirProposedUpdates[
      channel.theirProposedUpdates.length - 1
    ].sequenceNumber
  : 0
  
  return Math.max(
    myHighestSequenceNumber,
    theirHighestSequenceNumber
  )
}
