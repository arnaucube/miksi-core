/*

# deposit.circom
                     +----------+
                     |          |
PRI_secret+--------->+ Poseidon +<----+PUB_key
          |          |          |        +
          |          +----------+        |     +----------+
          |            nullifier         |     |          +<------+PUB_rootOld
          |               +              |     |          |
          |               |              |     |          +<------+PUB_rootNew
          |               v              |     | SMT      |
          |          +----+-----+        +---->+ Poseidon +<------+PRI_oldKey
          +--------->+          |              | Verifier |
                     |          +-----+------->+ (insert) +<------+PRI_oldValue
PUB_coinCode+------->+ Poseidon |     |        |          |
                     |          |     |        |          +<------+PRI_isOld0
PUB_amount+--------->+          |     |        |          |
                     +----------+     |        |          +<------+PRI_siblings
                                      |        +----------+
                                      |
                                      |
                                      |
                                      |
                   +----+             |
PUB_commitment+----> == +<------------+
                   +----+



*/

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/smt/smtprocessor.circom";

template Deposit(nLevels) {
	signal input coinCode;
	signal input amount;
	signal private input secret;
	signal private input oldKey;
	signal private input oldValue;
	signal private input isOld0;
	signal private input siblings[nLevels];
	signal input rootOld;
	signal input rootNew;
	signal input commitment;
	signal input key;

	component nullifierCmp = Poseidon(2, 6, 8, 57);
	nullifierCmp.inputs[0] <== key;
	nullifierCmp.inputs[1] <== secret;

	component hash = Poseidon(4, 6, 8, 57);
	hash.inputs[0] <== coinCode;
	hash.inputs[1] <== amount;
	hash.inputs[2] <== secret;
	hash.inputs[3] <== nullifierCmp.out; // nullifier

	component comCheck = IsEqual();
	comCheck.in[0] <== hash.out;
	comCheck.in[1] <== commitment;
	comCheck.out === 1;

	
	component smtProcessor = SMTProcessor(nLevels);
	smtProcessor.oldRoot <== rootOld;
	smtProcessor.newRoot <== rootNew;
	for (var i=0; i<nLevels; i++) {
		smtProcessor.siblings[i] <== siblings[i];
	}
	smtProcessor.oldKey <== oldKey;
	smtProcessor.oldValue <== oldValue;
	smtProcessor.isOld0 <== isOld0;
	smtProcessor.newKey <== key;
	smtProcessor.newValue <== hash.out;
	smtProcessor.fnc[0] <== 1;
	smtProcessor.fnc[1] <== 0;
}
