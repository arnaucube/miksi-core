var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require("fs");
const { groth } = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;
const circomlib = require("circomlib");
const smt = require("circomlib").smt;
const Web3 = require("web3");
const nLevels = 5;
const coinCode = "0"; // refearing to ETH
const ethAmount = '1';
const amount = Web3.utils.toWei(ethAmount, 'ether');
exports.calcWitness = (wasm, secret, nullifier, commitments) => __awaiter(this, void 0, void 0, function* () {
    const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    const commitment = poseidon([coinCode, amount, secret, nullifier]).toString();
    let tree = yield smt.newMemEmptyTrie();
    yield tree.insert(1, 0);
    // old root
    const rootOld = tree.root;
    const resOld = yield tree.find(commitment);
    if (resOld.found) {
        console.error("leaf expect to not exist but exists");
    }
    let siblingsOld = resOld.siblings;
    while (siblingsOld.length < nLevels) {
        siblingsOld.push("0");
    }
    ;
    yield tree.insert(commitment, 0);
    // new root
    const rootNew = tree.root;
    const resNew = yield tree.find(commitment);
    if (!resNew.found) {
        console.error("leaf expect to exist but not exists");
    }
    let siblingsNew = resNew.siblings;
    while (siblingsNew.length < nLevels) {
        siblingsNew.push("0");
    }
    ;
    // calculate witness
    const input = unstringifyBigInts({
        "coinCode": coinCode,
        "amount": amount,
        "secret": secret,
        "nullifier": nullifier,
        "siblingsOld": siblingsOld,
        "siblingsNew": siblingsNew,
        "rootOld": rootOld,
        "rootNew": rootNew,
        "commitment": commitment
    });
    const options = {};
    const wc = yield WitnessCalculatorBuilder(wasm, options);
    const w = yield wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));
    return witness;
});
//# sourceMappingURL=miksi.js.map