package judge

import (
	"bytes"
	"crypto/rand"
	"errors"
	"io"
	"time"

	"github.com/agl/ed25519"
	"github.com/jtremback/usc-core/wire"
)

// Phases of a Tx
// Created
// Confirmed
// Verified

func sliceTo64Byte(slice []byte) *[64]byte {
	var array [64]byte
	copy(array[:], slice[:64])
	return &array
}

func sliceTo32Byte(slice []byte) *[32]byte {
	var array [32]byte
	copy(array[:], slice[:32])
	return &array
}

func randomBytes(c uint) ([]byte, error) {
	b := make([]byte, c)
	n, err := io.ReadFull(rand.Reader, b)
	if n != len(b) || err != nil {
		return nil, err
	}
	return b, nil
}

type Phase int

const (
	PENDING_OPEN   Phase = 1
	OPEN           Phase = 2
	PENDING_CLOSED Phase = 3
	CLOSED         Phase = 4
)

type Channel struct {
	ChannelId string
	Phase     Phase

	OpeningTx         *wire.OpeningTx
	OpeningTxEnvelope *wire.Envelope

	ProposedUpdateTx         *wire.UpdateTx
	ProposedUpdateTxEnvelope *wire.Envelope

	LastFullUpdateTx         *wire.UpdateTx
	LastFullUpdateTxEnvelope *wire.Envelope

	CloseTime              time.Time
	CancellationTxEnvelope *wire.Envelope

	Judge    *Judge
	Accounts []*Account

	FollowOnTxs []*wire.Envelope
}

type Account struct {
	Name    string
	Pubkey  []byte
	Address string
	Judge   *Judge
}

type Judge struct {
	Name    string
	Pubkey  []byte
	Privkey []byte
}

// NewJudge makes a new judge
func NewJudge(name string, address string) (*Judge, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}

	return &Judge{
		Name:    name,
		Pubkey:  pub[:],
		Privkey: priv[:],
	}, nil
}

// NewChannel creates a new Channel from an Envelope containing an opening transaction,
// an Account and a Peer.
func (jd *Judge) AddChannel(ev *wire.Envelope, otx *wire.OpeningTx, acct0 *Account, acct1 *Account) (*Channel, error) {
	if bytes.Compare(acct0.Judge.Pubkey, acct1.Judge.Pubkey) != 0 {
		return nil, errors.New("accounts do not have matching judges")
	}
	if !ed25519.Verify(sliceTo32Byte(otx.Pubkeys[0]), ev.Payload, sliceTo64Byte(ev.Signatures[0])) {
		return nil, errors.New("signature 0 invalid")
	}
	if !ed25519.Verify(sliceTo32Byte(otx.Pubkeys[1]), ev.Payload, sliceTo64Byte(ev.Signatures[1])) {
		return nil, errors.New("signature 1 invalid")
	}

	ch := &Channel{
		ChannelId:         otx.ChannelId,
		OpeningTx:         otx,
		OpeningTxEnvelope: ev,
		Accounts:          []*Account{acct0, acct1},
		Judge:             jd,
		Phase:             OPEN,
	}

	return ch, nil
}

func (jd *Judge) SignEnvelope(ev *wire.Envelope) *wire.Envelope {
	ev.Signatures = append(ev.Signatures, [][]byte{ed25519.Sign(sliceTo64Byte(jd.Privkey), ev.Payload)[:]}...)

	return ev
}

func (ch *Channel) AddUpdateTx(ev *wire.Envelope, utx *wire.UpdateTx) error {
	if !ed25519.Verify(sliceTo32Byte(ch.OpeningTx.Pubkeys[0]), ev.Payload, sliceTo64Byte(ev.Signatures[0])) {
		return errors.New("signature 0 invalid")
	}
	if !ed25519.Verify(sliceTo32Byte(ch.OpeningTx.Pubkeys[1]), ev.Payload, sliceTo64Byte(ev.Signatures[1])) {
		return errors.New("signature 1 invalid")
	}

	if utx.ChannelId != ch.OpeningTx.ChannelId {
		return errors.New("ChannelId does not match")
	}

	if ch.ProposedUpdateTx != nil {
		if !(ch.ProposedUpdateTx.SequenceNumber < utx.SequenceNumber) {
			return errors.New("sequence number too low")
		}
	}

	if ch.LastFullUpdateTx != nil {
		if !(ch.LastFullUpdateTx.SequenceNumber < utx.SequenceNumber) {
			return errors.New("sequence number too low")
		}
	}

	ch.ProposedUpdateTx = utx
	ch.ProposedUpdateTxEnvelope = ev
	return nil
}

func (ch *Channel) AddCancellationTx(ev *wire.Envelope) error {
	if ch.Phase != OPEN {
		return errors.New("channel must be open")
	}

	if !ed25519.Verify(sliceTo32Byte(ch.Accounts[0].Pubkey), ev.Payload, sliceTo64Byte(ev.Signatures[0])) ||
		!ed25519.Verify(sliceTo32Byte(ch.Accounts[1].Pubkey), ev.Payload, sliceTo64Byte(ev.Signatures[0])) {
		return errors.New("signature invalid")
	}

	if ch.Phase == OPEN {
		ch.Phase = PENDING_CLOSED
		ch.CancellationTxEnvelope = ev
		ch.CloseTime = time.Now()
	}
	return nil
}

func (ch *Channel) ConfirmClose() {
	ch.Phase = CLOSED
}

// AddFollowOnTx verifies a FollowOnTx's signature and adds it to the Channel's
// FollowOnTxs array.
func (ch *Channel) AddFollowOnTx(ev *wire.Envelope) error {
	if ch.Phase != PENDING_CLOSED {
		return errors.New("channel must be pending closed")
	}

	if !ed25519.Verify(sliceTo32Byte(ch.Accounts[0].Pubkey), ev.Payload, sliceTo64Byte(ev.Signatures[0])) ||
		!ed25519.Verify(sliceTo32Byte(ch.Accounts[1].Pubkey), ev.Payload, sliceTo64Byte(ev.Signatures[0])) {
		return errors.New("signature invalid")
	}

	ch.FollowOnTxs = append(ch.FollowOnTxs, ev)
	return nil
}
