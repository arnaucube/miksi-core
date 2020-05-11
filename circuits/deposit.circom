/*

# deposit.circom

                     +----------+              +----------+
PUB_nullifier+------>+          |              |          |
                     |          |              | SMT      |
PUB_coinCode+------->+          |              | Poseidon +<------+PUB_rootOld
                     | Poseidon +-+----------->+ Verifier |
PUB_amount+--------->+          | |            | Non      |
                     |          | |            | Existance+<------+PRI_siblings
PRI_secret+--------->+          | |            |          |          +
                     +----------+ |            +----------+          |
                                  |                                  |
                                  |                                  |
                                  |            +----------+          |
                                  |            |          |          |
                                  |            |          |          |
                   +----+         |            | SMT      +<---------+
PUB_commitment+----> == +<--------+----------->+ Poseidon |
                   +----+                      | Verifier |
                                               |          +<------+PUB_rootNew
                                               |          |
                                               +----------+


*/

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/smt/smtverifier.circom";

template Deposit(nLevels) {
	signal input coinCode;
	signal input amount;
	signal private input secret;
	signal input nullifier;
	signal private input siblingsOld[nLevels];
	signal private input siblingsNew[nLevels];
	signal input rootOld;
	signal input rootNew;
	signal input commitment;

	component hash = Poseidon(4, 6, 8, 57);
	hash.inputs[0] <== coinCode;
	hash.inputs[1] <== amount;
	hash.inputs[2] <== secret;
	hash.inputs[3] <== nullifier;

	component comCheck = IsEqual();
	comCheck.in[0] <== hash.out;
	comCheck.in[1] <== commitment;
	comCheck.out === 1;

	// TODO instead of 2 siblings input, get siblingsOld from siblingsNew[len-1]

	component smtOld = SMTVerifier(nLevels);
	smtOld.enabled <== 1;
	smtOld.fnc <== 1;
	smtOld.root <== rootOld;
	for (var i=0; i<nLevels; i++) {
		smtOld.siblings[i] <== siblingsOld[i];
	}
	smtOld.oldKey <== 1;
	smtOld.oldValue <== 0;
	smtOld.isOld0 <== 0;
	smtOld.key <== hash.out;
	smtOld.value <== 0;

	component smtNew = SMTVerifier(nLevels);
	smtNew.enabled <== 1;
	smtNew.fnc <== 0;
	smtNew.root <== rootNew;
	for (var i=0; i<nLevels; i++) {
		smtNew.siblings[i] <== siblingsNew[i];
	}
	smtNew.oldKey <== 0;
	smtNew.oldValue <== 0;
	smtNew.isOld0 <== 0;
	smtNew.key <== hash.out;
	smtNew.value <== 0;
}

component main = Deposit(5);
