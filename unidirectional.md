Unidirectional payment channels avoid the need for sequence number and challenge period. 

One of the participants has the role of payer, and the other of payee. Only the payee is allowed to close the channel. To make payments, the payer increments the amount held in escrow that will be released to the payee when the channel closes. To close the channel, the payee signs the latest update and submits it to the blockchain.

Of course, the payee could keep the payer's funds locked up forever (although they can't steal the funds). If there is any way for the payer to unlock the funds, we can think of the channel as basically being the same thing as a bidirectional channel, unless there is some distinction between closing the channel without changes and with changes. But 