/*
# withdraw.circom

WARNING: WIP, very initial version of the miksi circuit

                     +--------+
PUB_coinCode+------->+        |
                     |        |        +----+
PUB_amount+--------->+Poseidon+------->+ == +<-----+PUB_commitment
                     |        |        +----+
PRI_secret+--------->+        |
                     +--------+



*/

include "../node_modules/circomlib/circuits/babyjub.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/smt/smtverifier.circom";
include "../node_modules/circomlib/circuits/smt/smtprocessor.circom";

template Withdraw() {
	signal input coinCode;
	signal input amount;
	signal input commitment;
	signal private input secret;

	component hash = Poseidon(3, 6, 8, 57);
	hash.inputs[0] <== coinCode;
	hash.inputs[1] <== amount;
	hash.inputs[2] <== secret;

	component eq = IsEqual();
	eq.in[0] <== hash.out;
	eq.in[1] <== commitment;
	eq.out === 1;
}

component main = Withdraw();
