# miksi [![Test](https://github.com/miksi-labs/miksi-core/workflows/Test/badge.svg)](https://github.com/miksi-labs/miksi-core/actions?query=workflow%3ATest)

*From Esperanto, **miksi** (miks·i): to mingle, to blend, to mix, to shuffle*

Ethereum mixer where all the computation & constructions are done offchain and then proved inside a zkSNARK to the Smart Contract (for the *deposit* and for the *withdraw*).
This means that the client builds a MerkleTree and makes all the needed computation, and then generates a zk-proof where proves that all the offchain computation is done following all the rules (no leaf deletion, only one leaf addition, correct leaf format).
This allows to use only `~325.000 gas` for the *deposit*, and `~308.000 gas` for the withdraw.

![](miksi-logo00-small.png)

**Warning:** This repository is in a very early stage. The current version works, but is not finished and there are some improvements to be added.

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
**Note:** The spec & code is a work in progress, there are some pending works & improvements planned to do, and some diagrams for better explanation.

### Deposit
*All computation & constructions are done offchain and then proved inside a zkSNARK to the Smart Contract*
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
	- prover knows the `secret` & `nullifier` for the `commitment` which is in a leaf in the merkletree
	- the transition from `RootOld` (the current one in the Smart Contract) to `RootNew` has been done following the rules (only one leaf addition, no leaf deletion, correct leaf format, etc)
- user sends ETH to the smart contract `deposit` call, together with the zkProof data
- smart contract verifies the zkProof of the deposit, and if everything is ok stores the commitment & the new root

Deposit circuit can be found [here](https://github.com/miksi-labs/miksi-core/blob/master/circuits/deposit.circom).

### Withdraw
*All computation & constructions are done offchain and then proved inside a zkSNARK to the Smart Contract*
- user gets all the commitments from the SmartContract
- build the MerkleTree with the getted commitments
- generate the siblings (merkle proof) for the `commitment` of which the user knows the `secret` & `nullifier`
- generate zkSNARK proof, where is proving:
        - user knows a `secret` for a public `nullifier`
        - which `commitment` is in the MerkleTree
        - which MerkleTree `root` is the one that knows the SmartContract
- if the zkProof verification passes, and the nullifier was not already used, the Smart Contract sends the ETH to the specified address

Withdraw circuit can be found [here](https://github.com/miksi-labs/miksi-core/blob/master/circuits/withdraw.circom).


# Thanks
Miksi is possible thanks to  [circom](https://github.com/iden3/circom), [circomlib](https://github.com/iden3/circomlib), [wasmsnark](https://github.com/iden3/wasmsnark), and thanks to the ideas about offchain computation validated with a zkSNARK in the [Zexe paper](https://eprint.iacr.org/2018/962.pdf).
