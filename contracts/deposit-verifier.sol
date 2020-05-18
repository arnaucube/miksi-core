//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// 2019 OKIMS
//      ported to solidity 0.5
//      fixed linter warnings
//      added requiere error messages
//
pragma solidity ^0.6.0;
library DepositPairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() internal pure returns (G2Point memory) {
        // Original code point
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );

/*
        // Changed by Jordi point
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
*/
    }
    /// @return the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas() estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-add-failed");
    }
    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas() estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length,"pairing-lengths-failed");
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas() estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-opcode-failed");
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}
contract DepositVerifier {
    using DepositPairing for *;
    struct VerifyingKey {
        DepositPairing.G1Point alfa1;
        DepositPairing.G2Point beta2;
        DepositPairing.G2Point gamma2;
        DepositPairing.G2Point delta2;
        DepositPairing.G1Point[] IC;
    }
    struct Proof {
        DepositPairing.G1Point A;
        DepositPairing.G2Point B;
        DepositPairing.G1Point C;
    }
    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alfa1 = DepositPairing.G1Point(21506687545368058004343406580116567034147526000842816840128545276973742545184,6329182718686089171038341156980474851697706805700950494904106219620407014616);
        vk.beta2 = DepositPairing.G2Point([4879555627245165409149871538075733938105048434319249232400453218142465451413,21138288820909669606998883110984027323337220382339792251110701043897894551957], [5169549521058601698487664174209719268567349497614886596752309135835832995494,7084989950156422335683471222873313175020040191471459248919344470661092421274]);
        vk.gamma2 = DepositPairing.G2Point([987570836872361556778610365355843744529291372758555698218824999637155094052,12489208558759092424522966223520504564058471700691215920684299633681110938103], [8467175820494965874716563164629440451461359739737577595086242330541705449335,4885103742312078925552682301933241836611982659444780110903504720342522343037]);
        vk.delta2 = DepositPairing.G2Point([1857697941034599597747007249362130217164697733324024108343089531632013115631,10720701369897961653174284201368857135933412671924295535932129219862613390723], [3456560663695994496422971399272199473998827789414669302047065719981784522344,1622122815068542292622030743771214576916556859911974349852742741130896660940]);
        vk.IC = new DepositPairing.G1Point[](7);
        vk.IC[0] = DepositPairing.G1Point(16782605380489280136898329894217631086273767090288708977044630687962383399712,19132176629326023148588718510027189847689206839350227494924742864011882964482);
        vk.IC[1] = DepositPairing.G1Point(3051091979340713905520740174087317073820219138899260014965710828520032438205,4332666002233816480303663354446417095506446455639166349896162400246016243480);
        vk.IC[2] = DepositPairing.G1Point(12656063712220015559994158114785100625064437916231441092291990522785048600025,15745941453121551808566905778505507754535684292109324766460425242566417993596);
        vk.IC[3] = DepositPairing.G1Point(5192851164182139068345289463860618976483494058569778412988156347204586590803,17230228592888907987066512201562762280889171374277031059677665774054871796127);
        vk.IC[4] = DepositPairing.G1Point(7773180646914901165561893028300805679120219758626526142234656359602783611229,8935008527712617619507470500760356832205500310299935052166857469092046352698);
        vk.IC[5] = DepositPairing.G1Point(7210880767140890921368045698924224491106328322805109472078454065459805978912,6053299184323673547596765506355707108280820282595136943043253651567389299444);
        vk.IC[6] = DepositPairing.G1Point(21754268299863456424252376593834862050583590653215284929555194788021295259186,12083666975153603989088504016147935022099865881580414349021892390012905182351);

    }
    function verify(uint[] memory input, Proof memory proof) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.IC.length,"verifier-bad-input");
        // Compute the linear combination vk_x
        DepositPairing.G1Point memory vk_x = DepositPairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field,"verifier-gte-snark-scalar-field");
            vk_x = DepositPairing.addition(vk_x, DepositPairing.scalar_mul(vk.IC[i + 1], input[i]));
        }
        vk_x = DepositPairing.addition(vk_x, vk.IC[0]);
        if (!DepositPairing.pairingProd4(
            DepositPairing.negate(proof.A), proof.B,
            vk.alfa1, vk.beta2,
            vk_x, vk.gamma2,
            proof.C, vk.delta2
        )) return 1;
        return 0;
    }
    function verifyProof(
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c,
            uint[6] memory input
        ) public view returns (bool r) {
        Proof memory proof;
        proof.A = DepositPairing.G1Point(a[0], a[1]);
        proof.B = DepositPairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = DepositPairing.G1Point(c[0], c[1]);
        uint[] memory inputValues = new uint[](input.length);
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}
