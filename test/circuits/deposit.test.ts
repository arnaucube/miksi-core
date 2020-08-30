const path = require("path");
const tester = require("circom").tester;
const chai = require("chai");
const assert = chai.assert;
const circomlib = require("circomlib");
const smt = require("circomlib").smt;

export {};

describe("deposit test", function () {
    this.timeout(200000);


    it("Test Deposit", async () => {
        const circuit = await tester(
            path.join(__dirname, "main", "deposit.circom"),
            {reduceConstraints: false}
        );

        const nLevels = 4;
        const secret = "1234567890";

        const coinCode = "0";
        const amount = '1000000000000000000';

        const poseidon = circomlib.poseidon.createHash(6, 8, 57);
        const nullifier = poseidon([2, secret]);
        const commitment = poseidon([coinCode, amount, secret, nullifier]).toString();

        // add commitment into SMT
        let tree = await smt.newMemEmptyTrie();
        await tree.insert(1, 0);

        let rootOld = tree.root;

        let res = await tree.insert(2, commitment);
        console.log("INSERT", res);
        let rootNew = tree.root;

        let siblings = res.siblings;
        while (siblings.length < nLevels) {
            siblings.push("0");
        };
        console.log("siblings", siblings);

        console.log(res);
        
        const witness = await circuit.calculateWitness({
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
            "key": 2
        });
        await circuit.checkConstraints(witness);
    });
});
