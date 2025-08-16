# Migrating from Solana web3.js version 1 to web3.js version 2

## Keypairs

- Everywhere you'd use `Keypair` you now use a `KeyPairSigner`. `Keypair.generate();` is now `generateKeyPairSigner()`.
- The old `keypair` is spelt `keyPair` everywhere like normal JS/TS camelCase.
- `secretkey` is now `privateKey`, but you generally use `KeyPairSigner` anywhere where secretKeys were used in web3.js version 1.

## Addresses / Public keys

- Most places that use `PublicKey` just use an `address`. `KeyPairSigner`s have a `keypairSigner.address` property.

## SOL amounts

- SOL amounts are in `lamports` which can be made from the native JS `BigInt`, so `1n` instead of `1`.

## Other changes

Commitment levels are defined explicitly

We get the transaction signature from signed transactions rather than having signatures as a return value.
