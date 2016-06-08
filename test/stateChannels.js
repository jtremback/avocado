import test from 'blue-tape'
import leftPad from 'left-pad'
import p from 'es6-promisify'
import setup from '../setup'

test('StateChannels', async () => {

    let { web3, contract, accounts } = await setup()

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
        const sig0 = p(web3.eth.sign)(accounts[2], fingerprint)
        const sig1 = p(web3.eth.sign)(accounts[1], fingerprint)

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


    test('rejects channel with non-valid signature1', async t => {
        const errLog = contract.Error([{ code: 1 }])
        const challengePeriod = 1
        const channelId = '0x3000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x1111'
        const fingerprint = solSha3(
            'newChannel',
            channelId,
            accounts[0],
            accounts[1],
            state,
            challengePeriod
        );


        const sig0 = await p(web3.eth.sign)(accounts[0], fingerprint)
        // Wrong account
        const sig1 = await p(web3.eth.sign)(accounts[2], fingerprint)

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

        t.equal(logs[0].args.message, 'signature1 invalid', 'did not return error');

        errLog.stopWatching()
    });

    test('update state', async t => {
        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const state = '0x2222'
        const sequenceNumber = 1
        const fingerprint = solSha3(
            'updateState',
            channelId,
            sequenceNumber,
            state
        )

        const sig0 = await p(web3.eth.sign)(accounts[0], fingerprint)
        const sig1 = await p(web3.eth.sign)(accounts[1], fingerprint)

        await contract.updateState(
            channelId,
            sequenceNumber,
            state,
            sig0,
            sig1
        )

        const savedChannel = await contract.getChannel.call(
            channelId
        )

        t.equal(savedChannel[5], state, 'state')
        t.equal(savedChannel[6].toString(10), '1', 'sequenceNumber')
    });

    test('start challenge period', async t => {
        const channelId = '0x1000000000000000000000000000000000000000000000000000000000000000'
        const fingerprint = solSha3(
            'startChallengePeriod',
            channelId
        )

        const sig = await p(web3.eth.sign)(accounts[0], fingerprint)

        await contract.startChallengePeriod(
            channelId,
            sig,
            accounts[0]
        )

        const savedChannel = await contract.getChannel.call(
            channelId
        )

        t.equal(savedChannel[0], accounts[0], 'addr0')
        t.equal(savedChannel[1], accounts[1], 'addr1')
        t.equal(savedChannel[2].toString(10), '1', 'phase')
        t.equal(savedChannel[3].toString(10), '1', 'challengePeriod')
        t.ok(savedChannel[4].toString(10) > '1', 'closingBlock')
        t.equal(savedChannel[6].toString(10), '1', 'sequenceNumber')
    });

    test('exit', t => {
        t.end()
        process.exit(0)
    })

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
})
