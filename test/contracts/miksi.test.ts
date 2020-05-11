const DepositVerifier = artifacts.require("../../contracts/DepositVerifier");
const WithdrawVerifier = artifacts.require("../../contracts/WithdrawVerifier");
const Miksi = artifacts.require("../../contracts/Miksi.sol");

const chai = require("chai");
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');

const fs = require("fs");
const { groth } = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;
const circomlib = require("circomlib");
const smt = require("circomlib").smt;

contract("miksi", (accounts) => {


  const {
    0: owner,
    1: addr1, // used for the deposit
    2: addr2, // used for the withdraw
    3: addr3,
  } = accounts;

  let insVerifier;
  let insMiksi;

    const nLevels = 5;
    const secret = "1234567890";

    const coinCode = "0"; // refearing to ETH
    const ethAmount = '1';
    const amount = web3.utils.toWei(ethAmount, 'ether');
    const nullifier = "567891234";
    let tree;
    let siblingsOld;
    let siblingsNew;
    let rootOld;
    let rootNew;
    let commitment;
    let proof;
    let publicSignals;
    let commitmentsArray;

  before(async () => {
    insDepositVerifier = await DepositVerifier.new();
    insWithdrawVerifier = await WithdrawVerifier.new();
    insMiksi = await Miksi.new(insDepositVerifier.address, insWithdrawVerifier.address);
  });

  before(async() => {
    let balance_wei = await web3.eth.getBalance(addr1);
    // console.log("Balance at " + addr1, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('100000000000000000000');

    const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    commitment = poseidon([coinCode, amount, secret, nullifier]).toString();

    // deposit
    // add commitment into SMT
    tree = await smt.newMemEmptyTrie();
    await tree.insert(1, 0);

    rootOld = tree.root;
    const resC = await tree.find(commitment);
    assert(!resC.found);
    siblingsOld = resC.siblings;
    while (siblingsOld.length < nLevels) {
        siblingsOld.push("0");
    };

    await tree.insert(commitment, 0);
    rootNew = tree.root;

    expect(rootOld.toString()).to.be.equal('11499909227292257605992378629333104385616480982267969744564817844870636870870');
    expect(rootNew.toString()).to.be.equal('9328869343897770565751281504295758914771207504252217956739346620422361279598');
  });

  it("Make the deposit", async () => {
    const resC = await tree.find(commitment);
    assert(resC.found);
    siblingsNew = resC.siblings;
    while (siblingsNew.length < nLevels) {
        siblingsNew.push("0");
    };

    // calculate witness
    const wasm = await fs.promises.readFile("./build/deposit.wasm");
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
    // console.log("Calculate witness");
    const wc = await WitnessCalculatorBuilder(wasm, options);
    const w = await wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));

    // generate zkproof of commitment using snarkjs (as is a test)
    const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./build/deposit-proving_key.json", "utf8")));

    // console.log("Generate zkSNARK proof");
    const res = groth.genProof(provingKey, witness);
    proof = res.proof;
    publicSignals = res.publicSignals;

    const verificationKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./build/deposit-verification_key.json", "utf8")));
    let pubI = unstringifyBigInts([coinCode, amount, rootOld.toString(), rootNew.toString(), commitment]);
    let validCheck = groth.isValid(verificationKey, proof, pubI);
    assert(validCheck);
    await insMiksi.deposit(
      commitment,
      tree.root.toString(),
      [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      [
        [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
        [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
      ],
      [proof.pi_c[0].toString(), proof.pi_c[1].toString()],
      {from: addr1, value: amount}
    );

    balance_wei = await web3.eth.getBalance(addr1);
    // console.log("Balance at " + addr1, web3.utils.fromWei(balance_wei, 'ether'));
    // expect(balance_wei).to.be.equal('98993526980000000000');
  });

  it("Get the commitments data", async () => {
    // getCommitments data
    let res = await insMiksi.getCommitments();
    expect(res[0][0].toString()).to.be.equal('189025084074544266465422070282645213792582195466360448472858620722286781863');
    expect(res[1].toString()).to.be.equal('9328869343897770565751281504295758914771207504252217956739346620422361279598');
    console.log(res[0]);
    commitmentsArray = res[0];
  });

  it("Rebuild the tree from sc commitments", async () => {
    let treeTmp = await smt.newMemEmptyTrie();
    await treeTmp.insert(1, 0);
    for (let i=0; i<commitmentsArray.length; i++) {
      await treeTmp.insert(commitmentsArray[i], 0);
    }
    expect(treeTmp.root).to.be.equal(tree.root);
  });

  it("Calculate witness and generate the zkProof", async () => {
    const resC = await tree.find(commitment);
    assert(resC.found);
    let siblings = resC.siblings;
    while (siblings.length < nLevels) {
        siblings.push("0");
    };
    // console.log("siblings", siblings);

    // calculate witness
    const wasm = await fs.promises.readFile("./build/withdraw.wasm");
    const input = unstringifyBigInts({
      "coinCode": coinCode,
      "amount": amount,
      "secret": secret,
      "nullifier": nullifier,
      "siblings": siblings,
      "root": tree.root,
      "address": addr2
    });
    const options = {};
    // console.log("Calculate witness");
    const wc = await WitnessCalculatorBuilder(wasm, options);
    const w = await wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));

    // generate zkproof of commitment using snarkjs (as is a test)
    const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./build/withdraw-proving_key.json", "utf8")));

    // console.log("Generate zkSNARK proof");
    const res = groth.genProof(provingKey, witness);
    proof = res.proof;
    publicSignals = res.publicSignals;
  });

  it("Try to use the zkProof with another address and get revert", async () => {
    // console.log("Try to reuse the zkproof and expect revert");
    await truffleAssert.fails(
      insMiksi.withdraw(
        addr1,
        nullifier,
        [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
        [
          [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
          [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
        ],
        [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
      ),
      truffleAssert.ErrorType.REVERT,
      "zkProof withdraw could not be verified"
    );
  });

  it("Withdraw 1 ETH with the zkProof", async () => {
    // withdraw
    // console.log("Withdraw of " + ethAmount + " ETH to " + addr2);
    let resW = await insMiksi.withdraw(
      addr2,
      nullifier,
      [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      [
        [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
        [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
      ],
      [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
    );
    // console.log("resW", resW);

    balance_wei = await web3.eth.getBalance(addr2);
    // console.log("Balance at " + addr2, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('101000000000000000000');
  });

  it("Try to reuse the zkProof and get revert", async () => {
    // console.log("Try to reuse the zkproof and expect revert");
    await truffleAssert.fails(
      insMiksi.withdraw(
        addr2,
        nullifier,
        [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
        [
          [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
          [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
        ],
        [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
      ),
      truffleAssert.ErrorType.REVERT,
      "nullifier already used"
    );
    balance_wei = await web3.eth.getBalance(addr2);
    expect(balance_wei).to.be.equal('101000000000000000000');
  });
});
