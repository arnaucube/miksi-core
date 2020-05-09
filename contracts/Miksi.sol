pragma solidity ^0.6.0;

import './verifier.sol';

contract Miksi {
  Verifier    verifier;

  constructor( address _verifierContractAddr) public {
    verifier = Verifier(_verifierContractAddr);
  }

  mapping(uint256 => Deposit) deposits;

  struct Deposit {
    uint256 coinCode;
    uint256 amount;
  }

  function deposit(
            uint256 coinCode,
            uint256 amount,
            uint256 commitment
  ) public {
    deposits[commitment] = Deposit(coinCode, amount);
  }

  function getDeposit(
            uint256 commitment
  ) public view returns (uint256, uint256) {
    return (
      deposits[commitment].coinCode,
      deposits[commitment].amount
    );
  }

  function withdraw(
            uint256 commitment,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public {

    uint256[3] memory input = [
      deposits[commitment].coinCode,
      deposits[commitment].amount,
      commitment
    ];
    require(verifier.verifyProof(a, b, c, input), "zkProof withdraw could not be verified");

    // zk verification passed, proceed with the withdraw
  }
}
