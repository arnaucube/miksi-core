const Verifier = artifacts.require("../../contracts/Verifier");
const Miksi = artifacts.require("../../contracts/Miksi.sol");

const chai = require("chai");
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');

const fs = require("fs");
const { groth } = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;
const circomlib = require("circomlib");

contract("miksi", (accounts) => {


  const {
    0: owner,
    1: addr1, // used for the deposit
    2: addr2, // used for the withdraw
    3: addr3,
  } = accounts;

  let insVerifier;
  let insMiksi;

  before(async () => {

    insVerifier = await Verifier.new();
    insMiksi = await Miksi.new(insVerifier.address);
  });

  it("miksi flow", async () => {
    const secret = "123456789";

    const coinCode = "0"; // refearing to ETH
    const ethAmount = '0.5';
    const amount = web3.utils.toWei(ethAmount, 'ether');

    let balance_wei = await web3.eth.getBalance(addr1);
    console.log("Balance at " + addr1, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('100000000000000000000');

    const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    const commitment = poseidon([coinCode, amount, secret]).toString();

    // deposit
    console.log("Deposit of " + ethAmount + " ETH from " + addr1);
    await insMiksi.deposit(coinCode, commitment, {from: addr1, value: amount});

    balance_wei = await web3.eth.getBalance(addr1);
    console.log("Balance at " + addr1, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('99499107180000000000');

    // getDeposit data
    const res = await insMiksi.getDeposit(commitment);
    expect(res[0].toString()).to.be.equal(coinCode);
    expect(res[1].toString()).to.be.equal(amount);


    // calculate witness
    const wasm = await fs.promises.readFile("./build/withdraw.wasm");
    const input = unstringifyBigInts({
      "coinCode": coinCode,
      "amount": amount,
      "commitment": commitment,
      "secret": secret,
      "address": addr2
    });
    const options = {};
    console.log("Calculate witness");
    const wc = await WitnessCalculatorBuilder(wasm, options);
    const w = await wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));

    // generate zkproof of commitment using snarkjs (as is a test)
    const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./build/proving_key.json", "utf8")));

    console.log("Generate zkSNARK proof");
    const {proof, publicSignals} = groth.genProof(provingKey, witness);

    // withdraw
    console.log("Withdraw of " + ethAmount + " ETH to " + addr2);
    let resW = await insMiksi.withdraw(
      commitment, 
      addr2,
      [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      [
        [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
        [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
      ],
      [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
    );
    // console.log("resW", resW);

    balance_wei = await web3.eth.getBalance(addr2);
    console.log("Balance at " + addr2, web3.utils.fromWei(balance_wei, 'ether'));
    expect(balance_wei).to.be.equal('100500000000000000000');

    console.log("Try to reuse the zkproof and expect revert");
    await truffleAssert.fails(
      insMiksi.withdraw(
        commitment, 
        addr2,
        [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
        [
          [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
          [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
        ],
        [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
      ),
      truffleAssert.ErrorType.REVERT,
      "deposit already withdrawed"
    );
    balance_wei = await web3.eth.getBalance(addr2);
    expect(balance_wei).to.be.equal('100500000000000000000');
  });
});
