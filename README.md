# miksi [![Test](https://github.com/miksi-labs/miksi-core/workflows/Test/badge.svg)](https://github.com/miksi-labs/miksi-core/actions?query=workflow%3ATest)

*From Esperanto, **miksi** (miks·i): to mingle, to blend, to mix, to shuffle*

![](miksi-logo00-small.png)


**Warning:** This repository is in a very early stage.

WebApp to use miksi-core can be found at https://github.com/arnaucube/miksi-app

## Circuits tests
```
npm run test-circuits
```

## Smart Contracts tests
```
npm run test-sc
```

### Compile circom circuit & generate Groth16 verifier contract

```
./compile-circuits.sh
```


## Spec draft

### Deposit
- user generates a random `secret` & `nullifier`
- computes the `commitment`, which is the Poseidon hash: `commitment = H(coinCode, amount, secret, nullifier)`, where:
	- `coinCode`: code that specifies which currency is being used (`0`==ETH)
	- `amount`: the amount to be deposited
	- `secret`: random, private
	- `nullifier`: random
- get all the commitments from the SmartContract
- build the MerkleTree with the getted commitments
- add the new computed `commitment` into the MerkleTree
- generate zkSNARK proof, where is proving:
	- prover knows the `secret` & `nullifier` for the `commitment`
	- the transition from `RootOld` (the current one in the Smart Contract) to `RootNew` has been done following the rules (only one addition, no deletion)
- user sends ETH to the smart contract `deposit` call, together with the zkProof data

Deposit circuit can be found [here](https://github.com/miksi-labs/miksi-core/blob/master/circuits/deposit.circom).

### Withdraw
- user gets all the commitments from the SmartContract
- build the MerkleTree with the getted commitments
- generate the siblings for the `commitment` of which the user knows the `secret` & `nullifier`
- generate zkSNARK proof, where is proving:
        - user knows a `secret` for a public `nullifier`
        - which `commitment` is in the MerkleTree
        - which MerkleTree `root` is the one that knows the SmartContract
- if the zkProof verification passes, and the nullifier was not already used, the Smart Contract sends the ETH to the specified address

Withdraw circuit can be found [here](https://github.com/miksi-labs/miksi-core/blob/master/circuits/withdraw.circom).

