const path = require("path");
const tester = require("circom").tester;
const chai = require("chai");
const assert = chai.assert;
const circomlib = require("circomlib");

export {};

describe("withdraw test", function () {
    this.timeout(200000);


    it("Test Withdraw", async () => {
        const circuit = await tester(
            path.join(__dirname, "../circuits/circuits", "withdraw.circom"),
            {reduceConstraints: false}
        );

        // const secret = Math.floor(Math.random()*1000).toString();
        const secret = "123456789";

        const coinCode = "1";
        const amount = "100";

        const poseidon = circomlib.poseidon.createHash(6, 8, 57);
        const commitment = poseidon([coinCode, amount, secret]).toString();

        const witness = await circuit.calculateWitness({
            "coinCode": coinCode,
            "amount": amount,
            "commitment": commitment,
            "secret": secret
        });
        await circuit.checkConstraints(witness);
    });
});
