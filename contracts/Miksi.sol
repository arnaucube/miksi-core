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
            // uint256 amount,
            uint256 commitment
  ) public payable {
    deposits[commitment] = Deposit(coinCode, msg.value);
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
            address payable _address,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public {

    uint256[4] memory input = [
      deposits[commitment].coinCode,
      deposits[commitment].amount,
      commitment,
      uint256(_address)
    ];
    require(verifier.verifyProof(a, b, c, input), "zkProof withdraw could not be verified");
    // zk verification passed, proceed with the withdraw
    _address.send(deposits[commitment].amount);
    // _address.call.value(deposits[commitment].amount).gas(20317)();

  }
}
