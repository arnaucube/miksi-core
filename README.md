# miksi [![Test](https://github.com/miksi-labs/miksi-core/workflows/Test/badge.svg)](https://github.com/miksi-labs/miksi-core/actions?query=workflow%3ATest)

*From Esperanto, **miksi** (miks·i): to mingle, to blend, to mix, to shuffle*

Ethereum mixer where all the computation & constructions are done offchain and then proved inside a zkSNARK to the smart-contract (both to *deposit* and *withdraw*).

The client builds a MerkleTree, carries out the required computation, and then generates a zk-proof proving that the offchain computation has been done correctly (no leaf deletion, and only one correctly formatted leaf addition).
This approach requires only `~325.000 gas` to *deposit* (compared to `~1M gas` for an onchain computation approach) , and `~308.000 gas` to *withdraw*.

These gas savings come from the fact that we don't need to carry out the MerkleTree computations onchain. Instead, we prove the correctness of these offchain computations inside the snark proof, and verify this proof onchain. It's much cheaper to verify the proof than to carry out the necessary computations onchain.

![](miksi-logo00-small.png)

**Warning:** This repository is in a very early stage. The current version works, but is not finished. There are some improvements in the works.

The WebApp to use miksi-core can be found at https://github.com/arnaucube/miksi-app

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
**Note:** Both the spec and the code are works in progress. There are some pending improvements in the works, and some diagrams are needed to better explain things.

### Deposit
*All computations and constructions are done offchain and then proved inside a zkSNARK to the smart-contract*

From the depositer's perspective, the interface facilitates the following flow:

1. Generate a random `secret` & `nullifier`

2. Compute the `commitment`, which is the Poseidon hash: `commitment = H(coinCode, amount, secret, nullifier)`, where:
	- `coinCode`: code that specifies which currency is being used (`0`==ETH)
	- `amount`: the amount to be deposited
	- `secret`: random, private
	- `nullifier`: random
	
3. Fetch all the commitments from the smart-contract

4. Build the MerkleTree with the fetched commitments

5. Add the newly computed `commitment` to the MerkleTree

6. Generate a zkSNARK proof, which proves:
	- you know the `secret` & `nullifier` for the `commitment` contained in the leaf you've just added to the MerkleTree
	- the transition from `RootOld` (the current one in the smart-contract) to `RootNew` has been done following the rules (no leaf deletion, and only one correctly formatted leaf addition, etc.)
	
7. Send ETH to the smart-contract `deposit` call, together with the zkProof data

Once these steps have been carried out, the smart-contract verifies the zkProof of the deposit, and if everything checks out ok, stores the commitment and the new root.

The deposit circuit can be found [here](https://github.com/miksi-labs/miksi-core/blob/master/circuits/deposit.circom).

### Withdraw
*As before, all computations and constructions are done offchain and then proved inside a zkSNARK to the Smart Contract*

From the withdrawer's perspective, the interface facilitates the following flow:

1. Fetch all the commitments from the smart-contract

2. Build the MerkleTree with the fetched commitments

3. Generate the siblings (merkle proof) for the `commitment` whose `secret` & `nullifier` you know

4. Generate a zkSNARK proof, which proves:
        - you know a `secret` for a `nullifier` you reveal, whose `commitment` is in a MerkleTree with `root` matching the one stored in the smart-contract
	
If the zkProof verification passes, and the nullifier has not already been used, the smart-contract sends the ETH to the specified address.

The withdraw circuit can be found [here](https://github.com/miksi-labs/miksi-core/blob/master/circuits/withdraw.circom).


# Thanks
Miksi is made possible thanks to [circom](https://github.com/iden3/circom), [circomlib](https://github.com/iden3/circomlib), [wasmsnark](https://github.com/iden3/wasmsnark), and the ideas developed in the [Zexe paper](https://eprint.iacr.org/2018/962.pdf).
