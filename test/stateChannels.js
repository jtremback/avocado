// TODO: refactor away from truffle format

/*global StateChannels web3 Uint8Array*/
import test from 'blue-tape'
import sha3 from 'js-sha3'
import leftPad from 'left-pad'
import p from 'es6-promisify'
import fs from 'fs'
import Web3 from 'web3'
import Pudding from 'ether-pudding'
import TestRPC from 'ethereumjs-testrpc'
import solc from 'solc'

const keccak = sha3.keccak_256

const SOL_PATH = __dirname + '/../contracts/'
const PUDDING_PATH = __dirname + '/../pudding/'
const TESTRPC_PORT = 8545

let web3

function solSha3 (...args) {
    args = args.map(arg => {
        if (typeof arg === 'string') {
            if (arg.substring(0, 2) === '0x') {
                return arg.slice(2)
            } else {
                return web3.toHex(arg).slice(2)
            }
        }

        if (typeof arg === 'number') {
            return leftPad((arg).toString(16), 64, 0)
        }
    })

    args = args.join('')

    return '0x' + web3.sha3(args, { encoding: 'hex' })
}

async function setup() {
  // COMPILE AND PUDDINGIFY
  // Everything in this section could be moved into another process
  // watching ./contracts
  const input = {
    'ECVerify.sol': fs.readFileSync(SOL_PATH + 'ECVerify.sol').toString(),
    'StateChannels.sol': fs.readFileSync(SOL_PATH + 'StateChannels.sol').toString()
  }

  const output = solc.compile({ sources: input }, 1)
  if (output.errors) { throw new Error(output.errors) }

  await Pudding.save({
    abi: JSON.parse(output.contracts['StateChannels'].interface),
    binary: output.contracts['StateChannels'].bytecode
  }, PUDDING_PATH + './StateChannels.sol.js')

  // START TESTRPC
  await p(TestRPC.server({
    mnemonic: 'elegant ability lawn fiscal fossil general swarm trap bind require exchange ostrich'
  }).listen)(TESTRPC_PORT)

  // MAKE WEB3
  web3 = new Web3()
  web3.setProvider(new Web3.providers.HttpProvider('http://localhost:' + TESTRPC_PORT))
  const accounts = await p(web3.eth.getAccounts)()
  web3.eth.defaultAccount = accounts[0]

  // INSTANTIATE PUDDING CONTRACT ABSTRACTION
  const StateChannels = require(PUDDING_PATH + './StateChannels.sol.js')
  StateChannels.setProvider(new Web3.providers.HttpProvider('http://localhost:' + TESTRPC_PORT))

  const contract = await StateChannels.new()

  return { contract, accounts }
}

test('StateChannels', async t => {
    const { contract, accounts } = await setup()

    test('adds channel and checks state', async t => {
        const challengePeriod = 1
        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x1111'
        const fingerprint = solSha3(
            'newChannel',
            channelId,
            accounts[0],
            accounts[1],
            state,
            challengePeriod
        )

        const sig0 = await p(web3.eth.sign)(accounts[0], fingerprint)
        const sig1 = await p(web3.eth.sign)(accounts[1], fingerprint)

        await contract.newChannel(
            channelId,
            accounts[0],
            accounts[1],
            state,
            challengePeriod,
            sig0,
            sig1
        )

        const savedChannel = await contract.getChannel.call(
            channelId
        )

        t.equal(savedChannel[0], accounts[0], 'addr0')
        t.equal(savedChannel[1], accounts[1], 'addr1')
        t.equal(savedChannel[2].toString(10), '0', 'phase')
        t.equal(savedChannel[3].toString(10), '1', 'challengePeriod')
        t.equal(savedChannel[4].toString(10), '0', 'closingBlock')
        t.equal(savedChannel[5], state, 'state')
        t.equal(savedChannel[6].toString(10), '0', 'sequenceNumber')
    });


    test('rejects channel with existant channelId', async t => {

        const errLog = contract.Error([{ code: 1 }])
        const challengePeriod = 1
        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x1111'
        const fingerprint = solSha3(
            'newChannel',
            channelId,
            accounts[0],
            accounts[1],
            state,
            challengePeriod
        )

        const sig0 = await p(web3.eth.sign)(accounts[0], fingerprint)
        const sig1 = await p(web3.eth.sign)(accounts[1], fingerprint)

        await contract.newChannel(
            channelId,
            accounts[0],
            accounts[1],
            state,
            1,
            sig0,
            sig1
        )

        const logs = await p(errLog.get.bind(errLog))()

        t.equal('channel with that channelId already exists', logs[0].args.message, 'did not return error');

        errLog.stopWatching()
    });

    test('rejects channel with non-valid signature0', async t => {

        const errLog = contract.Error([{ code: 1 }])
        const challengePeriod = 1
        const channelId = '0x2000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x1111'
        const fingerprint = solSha3(
            'newChannel',
            channelId,
            accounts[0],
            accounts[1],
            state,
            challengePeriod
        )

        // Wrong account
        const sig0 = p(web3.eth.sign.bind(web3))(accounts[2], fingerprint)
        const sig1 = p(web3.eth.sign.bind(web3))(accounts[1], fingerprint)

        await contract.newChannel(
            channelId,
            accounts[0],
            accounts[1],
            state,
            1,
            sig0,
            sig1
        )
        const logs = await p(errLog.get.bind(errLog))()

        t.equal(logs[0].args.message, 'signature0 invalid', 'did not return error');

        errLog.stopWatching()
    });


    test('exit', t => {
        t.end()
        process.exit(0)
    })
  })

  /*
contract('StateChannels', function (accounts) {


    it('rejects channel with non-valid signature1', mochaAsync(async () => {
        const meta = StateChannels.deployed()
        const errLog = meta.Error()
        const challengePeriod = 1
        const channelId = '0x3000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x1111'
        const fingerprint = solSha3(
            'newChannel',
            channelId,
            web3.eth.accounts[0],
            web3.eth.accounts[1],
            state,
            challengePeriod
        )

        const sig0 = web3.eth.sign(web3.eth.accounts[0], fingerprint)
        const sig1 = web3.eth.sign(web3.eth.accounts[2], fingerprint) // Wrong account

        await meta.newChannel(
            channelId,
            web3.eth.accounts[0],
            web3.eth.accounts[1],
            state,
            1,
            sig0,
            sig1
        )
        const logs = await errLog.get()

        assert.equal(logs[0].args.message, 'signature1 invalid', 'did not return error');
    }));

    it('update state', mochaAsync(async () => {
        const meta = StateChannels.deployed()
        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x2222'
        const sequenceNumber = 1
        const fingerprint = solSha3(
            'updateState',
            channelId,
            sequenceNumber,
            state
        )

        const sig0 = web3.eth.sign(web3.eth.accounts[0], fingerprint)
        const sig1 = web3.eth.sign(web3.eth.accounts[1], fingerprint)

        await meta.updateState(
            channelId,
            sequenceNumber,
            state,
            sig0,
            sig1
        )

        const savedChannel = await meta.getChannel.call(
            channelId
        )

        assert.equal(savedChannel[5], state, 'state')
        assert.equal(savedChannel[6].toString(10), '1', 'sequenceNumber')
    }));

    it('start challenge period', mochaAsync(async () => {
        const meta = StateChannels.deployed()
        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const fingerprint = solSha3(
            'startChallengePeriod',
            channelId
        )

        const sig = web3.eth.sign(web3.eth.accounts[0], fingerprint)

        await meta.startChallengePeriod(
            channelId,
            sig,
            web3.eth.accounts[0]
        )

        const savedChannel = await meta.getChannel.call(
            channelId
        )

        assert.equal(savedChannel[0], web3.eth.accounts[0], 'addr0')
        assert.equal(savedChannel[1], web3.eth.accounts[1], 'addr1')
        assert.equal(savedChannel[2].toString(10), '1', 'phase')
        assert.equal(savedChannel[3].toString(10), '1', 'challengePeriod')
        assert.isAbove(savedChannel[4].toString(10), '1', 'closingBlock')
        // assert.equal(savedChannel[5], state, 'state')
        assert.equal(savedChannel[6].toString(10), '1', 'sequenceNumber')
    }));
});
*/

function byteToHexString(uint8arr) {
    if (!uint8arr) {
        return '';
    }

    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
        var hex = (uint8arr[i] & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
    }

    return hexStr.toUpperCase();
}

function hexStringToByte(str) {
    if (!str) {
        return new Uint8Array();
    }

    var a = [];
    for (var i = 0, len = str.length; i < len; i += 2) {
        a.push(parseInt(str.substr(i, 2), 16));
    }

    return new Uint8Array(a);
}

function concatenate(resultConstructor, ...arrays) {
    let totalLength = 0;
    for (let arr of arrays) {
        totalLength += arr.length;
    }
    let result = new resultConstructor(totalLength);
    let offset = 0;
    for (let arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

// Extra Addresses

// 0xF18506eD9AdcA974c0e803859994d11fc8753885
// 579ac7f421b256fd8b9bd7a5f384f6499b98c9409f9d431137b9d69db129d65f

// 0xF8D07F73f5336b8b77D52143906a216E454E8f3a
// 14475f8d92fbee4e20ce9cb8fe8b434e57e5d80787e9ddd433ee66f848210ea9

// 0x8fb411A5Bb2F0fa6B247409F05494B56E9Fa730a
// 16add8e48cdfd12a07dd8ec86db7c284a41fbc0d7454272a332520bd2cf64180

// 0xff7FC071Eb3385D1A810bAABD3d870156a965b12
// 1d9cc52f5a6dbabb5dce7bec96fe729ca45a72323379d48b5641db36d5240c5d

// 0xf8c138b08cb32391C7Ab8Edbda61E023943f72d7
// 6712eb15afa15159ca2f8ae405bb6286929e81b1d1865186717500202cfcf9b8

// 0x763e646f269d9c50f24d2c4802859ccd185148497774bff4525426d4eb771d0b23e5157cc8dba35bd6eb075cbe7e3854e2775ad44f8c5ae3d3c7ec7c278947081b

// 41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c4d
