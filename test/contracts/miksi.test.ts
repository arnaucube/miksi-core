const Verifier = artifacts.require("../../contracts/Verifier");
const Miksi = artifacts.require("../../contracts/Miksi.sol");

const chai = require("chai");
const expect = chai.expect;

const fs = require("fs");
const { groth } = require('snarkjs');
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils;
const WitnessCalculatorBuilder = require("circom_runtime").WitnessCalculatorBuilder;
const circomlib = require("circomlib");

contract("miksi", (accounts) => {


  const {
    0: owner,
    1: idEth1,
    2: idEth2,
    3: idEth3,
  } = accounts;

  let insVerifier;
  let insMiksi;

  before(async () => {

    insVerifier = await Verifier.new();
    insMiksi = await Miksi.new(insVerifier.address);
  });

  it("miksi flow", async () => {
    const secret = "123456789";

    const coinCode = "1";
    const amount = "100";

    const poseidon = circomlib.poseidon.createHash(6, 8, 57);
    const commitment = poseidon([coinCode, amount, secret]).toString();

    // deposit
    await insMiksi.deposit(coinCode, amount, commitment);

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
      "secret": secret
    });
    const options = {};
    const wc = await WitnessCalculatorBuilder(wasm, options);
    const w = await wc.calculateWitness(input);
    const witness = unstringifyBigInts(stringifyBigInts(w));

    // generate zkproof of commitment using snarkjs (as is a test)
    const provingKey = unstringifyBigInts(JSON.parse(fs.readFileSync("./build/proving_key.json", "utf8")));

    const {proof, publicSignals} = groth.genProof(provingKey, witness);

    // withdraw
    const resW = await insMiksi.withdraw(
      commitment, 
      [proof.pi_a[0].toString(), proof.pi_a[1].toString()],
      [
        [proof.pi_b[0][1].toString(), proof.pi_b[0][0].toString()],
        [proof.pi_b[1][1].toString(), proof.pi_b[1][0].toString()]
      ],
      [proof.pi_c[0].toString(), proof.pi_c[1].toString()]
    );
    console.log("resW", resW);

  });
});
