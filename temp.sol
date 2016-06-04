import "ECVerify.sol"

contract StateChannels is ECVerify {
  // TODO ENUM?
  uint8 constant PHASE_OPEN = 0;
  uint8 constant PHASE_CHALLENGE = 1;
  uint8 constant PHASE_CLOSED = 2;

  mapping (bytes32 => Channel) channels;

  struct Channel {
    bytes32 channelId;
    address address0;
    address address1;
    uint phase;
    uint challengePeriod;
    uint closingBlock;
    bytes state;
    uint sequenceNumber;
  }

  function getChannel(bytes32 channelId) returns(
    address address0,
    address address1,
    uint8 phase,
    uint challengePeriod,
    uint closingBlock,
    bytes state,
    uint sequenceNumber
  ) {
    // TODO is this more efficient than copying the channels?
    // the code would be better if I didn't have to write channels[channelId]
    // if the variable in in storage, only the reference would get copied.
    // but then every operation would have to dereference an additional
    address0 = channels[channelId].address0;
    address1 = channels[channelId].address1;
    phase = channels[channelId];
    challengePeriod = channels[channelId].challengePeriod;
    closingBlock = channels[channelId].closingBlock;
    state = channels[channelId].state;
    sequenceNumber = channels[channelId].sequenceNumber;
  }
}
