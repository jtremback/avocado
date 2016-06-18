# Avocado
This is a project demonstrating a generalized, low-level state channel.

*What is a state channel?* A state channel is a way for two or more parties to maintain a state (any sequence of bytes) between them, being able to keep it updated without having to trust each other. This state can then be committed to the blockchain, at which point actions may be taken on it, such as releasing tokens from escrow. Participants in the channel exchanged signed state update transactions, and can close the channel at any time with confidence that the last valid update transaction will be honored. Because only the last update transaction is sent to the blockchain, they can be used to create very scalable systems. [Here's](http://www.jeffcoleman.ca/state-channels/) an easy explanation of state channels.

*What are state channels used for?* The most well-known use of state channels is in payment channels, a technique which allows two parties to pay each other by adjusting the balance of an escrow contract. Payment channels can also be linked together, allowing payments to be securely transmitted across multiple untrusted parties. This is the technique used in the Bitcoin Lightning network, and Ethereum's Raiden.

## Avocado structure
Avocado consists of a "judge contract" on the blockchain, and some offchain code that channel participants use to sign state updates and send them to one another over the network. The judge contract functions as an oracle- meaning that it only reports what the last valid state of the channel is, without taking action on that state.

It is up to the channel participants to set up another contract, the "executive contract". This is outside of the scope of Avocado. For example, in a payment channel, the executive contract would hold funds in escrow, and release them upon seeing that the judge contract reporting the channel as closed, in accordance with the closing state of the judge contract (each participant's ending balance).

The Avocado judge contract is in `contracts/StateChannels.sol`. There is also offchain code, which allows the channel participants to send state updates to eachother over the network. This code is in `offchain`.

The logic for the offchain code is in `offchain/logic.js`. Reading this file will tell you everything you need to know about how the offchain code works. Some functions in this file are meant to be called by user, or another application calling avocado. Others are meant to be called by the counterparty. In `offchain/servers`, there are two files, `peer.js`, and `caller.js`. `caller.js` serves up an http api which can be called by other applications controlled by the user of the channel. For instance, a visual interface or a higher level application, such as one implementing the offchain code to make updates to a payment channel. `peer.js` provides an api that the peers use to propose new channels, or updates to the state of an existing channel.

## Usage:
- Run `npm start` to start a state channel server.
- Then give it commands with `npm run cli`.
- For example, you can try `npm run cli test_cli`.
- Run `npm run offchain_tests` to test the integration of contract and offchain code.
