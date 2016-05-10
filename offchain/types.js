import t from 'tcomb'

export const Hex = t.refinement(
  t.String,
  (hex) => hex.slice(0, 2) === '0x',
  'Hex'
)

export const Address = t.refinement(
  Hex,
  (address) => address.length === 42,
  'Address'
)

export const Bytes32 = t.refinement(
  Hex,
  (bytes) => bytes.length === 66,
  'Bytes32'
)
