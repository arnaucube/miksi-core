const path = require("path");
const tester = require("circom").tester;
const chai = require("chai");
const assert = chai.assert;
const circomlib = require("circomlib");
const smt = require("circomlib").smt;

export {};

describe("withdraw test", function () {
    this.timeout(200000);


    it("Test Withdraw", async () => {
        const circuit = await tester(
            path.join(__dirname, "../../circuits", "withdraw.circom"),
            {reduceConstraints: false}
        );

        const nLevels = 17;
        const secret = "1234567890";

        const coinCode = "0";
        const amount = '1000000000000000000';
        const nullifier = "567891234";

        const poseidon = circomlib.poseidon.createHash(6, 8, 57);
        const commitment = poseidon([coinCode, amount, secret, nullifier]).toString();

        // add commitment into SMT
        let tree = await smt.newMemEmptyTrie();
        await tree.insert(1, 0);
        await tree.insert(2, commitment);
        await tree.insert(3, 0);
        console.log("root", tree.root);
        const res = await tree.find(2);
        assert(res.found);
        let siblings = res.siblings;
        while (siblings.length < nLevels) {
            siblings.push("0");
        };
        console.log("siblings", siblings);

        let root = tree.root;
        
        const witness = await circuit.calculateWitness({
            "coinCode": coinCode,
            "amount": amount,
            "secret": secret,
            "nullifier": nullifier,
            "siblings": siblings,
            "root": root,
            "address": "987654321",
            "key": 2
        });
        await circuit.checkConstraints(witness);
    });
});
