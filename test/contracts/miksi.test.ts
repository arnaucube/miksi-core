const DepositVerifier = artifacts.require("../build/DepositVerifier");
const WithdrawVerifier = artifacts.require("../build/WithdrawVerifier");
const Miksi = artifacts.require("../build/Miksi.sol");

const chai = require("chai");
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');

const fs = require("fs");
const { groth } = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const Fr = require("ffjavascript").bn128.Fr;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;
const circomlib = require("circomlib");
const smt = require("circomlib").smt;

let insVerifier;
let insMiksi;

const nLevels = 4;
const secret = ["1234567890", "987654321", "123"];

const coinCode = "0"; // refearing to ETH
const ethAmount = '1';
const amount = web3.utils.toWei(ethAmount, 'ether');
const nullifier = ["0", "0", "0"];
let commitment = [];
let tree;
let currKey=0;
let proofs = [];

contract("miksi", (accounts) => {


  const {
    0: owner,
    1: addr1, // used for the deposit
    2: addr2, // used for the withdraw
    3: addr3,
    4: addr4,
  } = accounts;


  before(async () => {
    insDepositVerifier = await DepositVerifier.new();
    insWithdrawVerifier = await WithdrawVerifier.new();
    insMiksi = await Miksi.new(insDepositVerifier.address, insWithdrawVerifier.address);
  });

  before(async() => {
    let balance_wei = await web3.eth.getBalance(addr1);
    // console.log("Balance at " + addr1, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('100000000000000000000');

    tree = await smt.newMemEmptyTrie();
    await tree.insert(currKey, 0);

    expect(tree.root.toString()).to.be.equal('7191590165524151132621032034309259185021876706372059338263145339926209741311');
  });

  it("Make first deposit", async () => {
    nullifier[0] = await makeDeposit(secret[0], addr1);
    balance_wei = await web3.eth.getBalance(addr1);
    // console.log("Balance at " + addr1, web3.utils.fromWei(balance_wei, 'ether'));
    // expect(balance_wei).to.be.equal('98993526980000000000');
  });
  it("Make second deposit", async () => {
    nullifier[1] = await makeDeposit(secret[1], addr3);
  });
  it("Make 3rd deposit", async () => {
    nullifier[2] = await makeDeposit(secret[2], addr3);
  });
  it("Get the commitments data & rebuild the tree", async () => {
    // get the commitments data
    let res = await insMiksi.getCommitments();
    expect(res[1].toString()).to.be.equal(tree.root.toString());
    let commitmentsArray = res[0];
    currKey = res[2];

    // rebuild the tree
    let treeTmp = await smt.newMemEmptyTrie();
    await treeTmp.insert(0, 0);
    for (let i=0; i < commitmentsArray.length; i++) {
      await treeTmp.insert(i+1, commitmentsArray[i]);
    }
    expect(treeTmp.root).to.be.equal(tree.root);
  });
  it("Calculate witness and generate the zkProof", async () => {
    proofs[0] = await genWithdrawZKProof(secret[0], nullifier[0], addr2, "1");
    proofs[1] = await genWithdrawZKProof(secret[1], nullifier[1], addr4, "2");
    proofs[2] = await genWithdrawZKProof(secret[2], nullifier[2], addr4, "3");
  });
  it("Try to use the zkProof with another address and get revert", async () => {
    // console.log("Try to reuse the zkproof and expect revert");
    await truffleAssert.fails(
      withdrawSC(nullifier[0], addr1, proofs[0]),
      truffleAssert.ErrorType.REVERT,
      "zkProof withdraw could not be verified"
    );
  });
  it("Withdraw 1 ETH with the zkProof of the 1st deposit to addr2", async () => {
    // withdraw
    // console.log("Withdraw of " + ethAmount + " ETH to " + addr2);
    let resW = await withdrawSC(nullifier[0], addr2, proofs[0]);
    // console.log("resW", resW);
  
    balance_wei = await web3.eth.getBalance(addr2);
    // console.log("Balance at " + addr2, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('101000000000000000000');
  });
  it("Try to reuse the zkProof and get revert", async () => {
    // console.log("Try to reuse the zkproof and expect revert");
    await truffleAssert.fails(
      withdrawSC(nullifier[0], addr2, proofs[0]),
      truffleAssert.ErrorType.REVERT,
      "nullifier already used"
    );
    balance_wei = await web3.eth.getBalance(addr2);
    expect(balance_wei).to.be.equal('101000000000000000000');
  });
  it("Withdraw 1 ETH with the zkProof of the 2nd deposit to addr4", async () => {
    let resW = await withdrawSC(nullifier[1], addr4, proofs[1]);
    balance_wei = await web3.eth.getBalance(addr4);
    expect(balance_wei).to.be.equal('101000000000000000000');
  });
  it("Withdraw 1 ETH with the zkProof of the 3rd deposit to addr4", async () => {
    let resW = await withdrawSC(nullifier[2], addr4, proofs[2]);
    balance_wei = await web3.eth.getBalance(addr4);
    expect(balance_wei).to.be.equal('102000000000000000000');
  });
});

async function makeDeposit(secret, addr) {
    currKey += 1;

    const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    let currNullifier = poseidon([currKey, secret]).toString();
    let currCommitment = poseidon([coinCode, amount, secret, currNullifier]).toString();

    let resI = await tree.insert(currKey, currCommitment);
    while (resI.siblings.length < nLevels) resI.siblings.push(Fr.e(0));

    // calculate witness
    const wasm = await fs.promises.readFile("./test/build/deposit.wasm");
    const input = unstringifyBigInts({
      "coinCode": coinCode,
      "amount": amount,
      "secret": secret,
      "oldKey": resI.isOld0 ? 0 : resI.oldKey,
      "oldValue": resI.isOld0 ? 0 : resI.oldValue,
      "isOld0": resI.isOld0 ? 1 : 0,
      "siblings": resI.siblings,
      "rootOld": resI.oldRoot,
      "rootNew": resI.newRoot,
      "commitment": currCommitment,
      "key": currKey
    });
    const options = {};
    // console.log("Calculate witness", input);
    const wc = await WitnessCalculatorBuilder(wasm, options);
    const w = await wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));

    // generate zkproof of commitment using snarkjs (as is a test)
    const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./test/build/deposit-proving_key.json", "utf8")));

    // console.log("Generate zkSNARK proof");
    const res = groth.genProof(provingKey, witness);
    let proof = res.proof;

    const verificationKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./test/build/deposit-verification_key.json", "utf8")));
    let pubI = unstringifyBigInts([coinCode, amount, resI.oldRoot.toString(), resI.newRoot.toString(), currCommitment, currKey]);
    let validCheck = groth.isValid(verificationKey, proof, pubI);
    // console.log("VALIDCHECK", validCheck, pubI, proof);
    assert(validCheck);
    await insMiksi.deposit(
      currCommitment,
      tree.root.toString(),
      [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      [
        [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
        [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
      ],
      [proof.pi_c[0].toString(), proof.pi_c[1].toString()],
      {from: addr, value: amount}
    );
    return currNullifier;
}

async function genWithdrawZKProof(secret, nullifier, addr, k) {
    const resC = await tree.find(k);
    assert(resC.found);
    let siblings = resC.siblings;
    while (siblings.length < nLevels) {
        siblings.push("0");
    };

    // calculate witness
    const wasm = await fs.promises.readFile("./test/build/withdraw.wasm");
    const input = unstringifyBigInts({
      "coinCode": coinCode,
      "amount": amount,
      "secret": secret,
      "nullifier": nullifier,
      "siblings": siblings,
      "root": tree.root,
      "address": addr,
      "key": k
    });
    const options = {};
    // console.log("Calculate witness");
    const wc = await WitnessCalculatorBuilder(wasm, options);
    const w = await wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));

    // generate zkproof of commitment using snarkjs (as is a test)
    const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./test/build/withdraw-proving_key.json", "utf8")));

    // console.log("Generate zkSNARK proof");
    const res = groth.genProof(provingKey, witness);
    return res.proof;
}

async function withdrawSC(nullifier, addr, proof) {
      // console.log("withdrawSC", proof);
      return insMiksi.withdraw(
        addr,
        nullifier,
        [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
        [
          [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
          [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
        ],
        [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
      );
}

