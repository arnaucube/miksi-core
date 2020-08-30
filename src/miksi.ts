const fs = require("fs");
const bigInt = require("big-integer");
const { groth } = require('snarkjs');
const { Fr } = require('ffjavascript').bn128;
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;
const circomlib = require("circomlib");
const smt = require("circomlib").smt;
const Web3 = require("web3");
// const buildBn128 = require("wasmsnark").buildBn128;


const coinCode = "0"; // refearing to ETH
const ethAmount = '1';
const amount = Web3.utils.toWei(ethAmount, 'ether');

exports.randBigInt = () => {
	return Fr.random();
};

exports.calcCommitment = (key, secret) => {
	const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    	const nullifier = poseidon([key, secret]).toString();
	const commitment = poseidon([coinCode, amount, secret, nullifier]).toString();
	return commitment;
};

exports.calcDepositWitness = async (wasm, nLevels, key, secret, commitments) => {
	const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    	const nullifier = poseidon([key, secret]).toString();
	const commitment = poseidon([coinCode, amount, secret, nullifier]).toString();

	console.log("Commitment", commitment.toString());

	// rebuild the tree
	let tree = await smt.newMemEmptyTrie();
	await tree.insert(0, 0);
	for (let i=0; i<commitments.length; i++) {
		await tree.insert(i+1, commitments[i]);
	}

	let res = await tree.insert(key, commitment);

	// new root
	let siblings = res.siblings;
	console.log(res);
	// while (siblings.length < nLevels) {
	//         siblings.push("0");
	// };

	// calculate witness
	const input = unstringifyBigInts({
		"coinCode": coinCode,
		"amount": amount,
		"secret": secret,
		"oldKey": res.isOld0 ? 0 : res.oldKey,
		"oldValue": res.isOld0 ? 0 : res.oldValue,
		"isOld0": res.isOld0 ? 1 : 0,
		"siblings": siblings,
		"rootOld": res.oldRoot,
		"rootNew": res.newRoot,
		"commitment": commitment,
		"key": key
	});
	console.log("input", input);
	// const options = {};
	// const wc = await WitnessCalculatorBuilder(wasm, options);

	const wc = await WitnessCalculatorBuilder(wasm);

	const witness = await wc.calculateWitness(input, {sanityCheck: true});

	const wBuff = Buffer.allocUnsafe(witness.length*32);

	for (let i=0; i<witness.length; i++) {
		for (let j=0; j<8; j++) {
			const bi = witness[i];
			const v = bigInt(bi).shiftRight(j*32).and(0xFFFFFFFF).toJSNumber();
			// wBuff.writeUInt32LE(v, i*32 + j*4, 4)
			wBuff.writeUInt32LE(v, i*32 + j*4)
		}
	}


	// const witness = unstringifyBigInts(stringifyBigInts(w));
	// return wBuff;
	return {
		witness: wBuff,
		publicInputs: {
			commitment:commitment,
			root:res.newRoot
		}
	};
}

exports.calcWithdrawWitness = async (wasm, nLevels, key, secret, commitments, addr) => {
	const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    	const nullifier = poseidon([key, secret]).toString();
	const commitment = poseidon([coinCode, amount, secret, nullifier]).toString();

	// rebuild the tree
	let tree = await smt.newMemEmptyTrie();
	await tree.insert(0, 0);
	for (let i=0; i<commitments.length; i++) {
		await tree.insert(i+1, commitments[i]);
	}
	// await tree.insert(commitment, 0);

	// root
	const root = tree.root;
	const res = await tree.find(key);
	if (!res.found) {
		console.error("leaf expect to exist but not exists, key:", key);
	}
	let siblings = res.siblings;
	while (siblings.length < nLevels) {
		siblings.push("0");
	};

	// calculate witness
	const input = unstringifyBigInts({
		"coinCode": coinCode,
		"amount": amount,
		"secret": secret,
		"nullifier": nullifier,
		"siblings": siblings,
		"root": root,
		"address": addr,
		"key": key
	});
	console.log("input", input);
	// const options = {};
	// const wc = await WitnessCalculatorBuilder(wasm, options);

	const wc = await WitnessCalculatorBuilder(wasm);

	const witness = await wc.calculateWitness(input, {sanityCheck: true});

	const wBuff = Buffer.allocUnsafe(witness.length*32);

	for (let i=0; i<witness.length; i++) {
		for (let j=0; j<8; j++) {
			const bi = witness[i];
			const v = bigInt(bi).shiftRight(j*32).and(0xFFFFFFFF).toJSNumber();
			// wBuff.writeUInt32LE(v, i*32 + j*4, 4)
			wBuff.writeUInt32LE(v, i*32 + j*4)
		}
	}


	// const witness = unstringifyBigInts(stringifyBigInts(w));
	return {
		witness: wBuff,
		publicInputs: {
			address:addr,
			nullifier:nullifier
		}
	};
}
