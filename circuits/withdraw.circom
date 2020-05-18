/*
# withdraw.circom

WARNING: WIP, very initial version of the miksi circuit



                     -----------+              +----------+
PUB_nullifier+------>+          |              |          |
                     |          |              |          |
PUB_coinCode+------->+          |              | SMT      +<------+PRI_siblings
                     | Poseidon +------------->+ Poseidon |
PUB_amount+--------->+          |              | Verifier |
                     |          |              |          +<------+PUB_root
PRI_secret+--------->+          |              |          |        +
                     +----------+              +----------+        |
                                                                   |
                                                                   |
                             +----+                  +----+        |
             PUB_address+--->+ != +<-------+0+------>+ != +<-------+
                             +----+                  +----+



*/

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/smt/smtverifier.circom";

template Withdraw(nLevels) {
	signal input coinCode;
	signal input amount;
	signal private input secret;
	signal input nullifier;
	signal private input siblings[nLevels];
	signal input root;
	signal input address;
	signal private input key;

	component hash = Poseidon(4, 6, 8, 57);
	hash.inputs[0] <== coinCode;
	hash.inputs[1] <== amount;
	hash.inputs[2] <== secret;
	hash.inputs[3] <== nullifier;

	component z = IsZero();
	z.in <== address;
	z.out === 0;

	component smtV = SMTVerifier(nLevels);
	smtV.enabled <== 1;
	smtV.fnc <== 0;
	smtV.root <== root;
	for (var i=0; i<nLevels; i++) {
		smtV.siblings[i] <== siblings[i];
	}
	smtV.oldKey <== 0;
	smtV.oldValue <== 0;
	smtV.isOld0 <== 0;
	smtV.key <== key;
	smtV.value <== hash.out;
}

component main = Withdraw(17); // 16 real levels (due circom leaf protection)
