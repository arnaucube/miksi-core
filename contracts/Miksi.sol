pragma solidity ^0.6.0;

import './verifier.sol';

contract Miksi {
  Verifier    verifier;

  constructor( address _verifierContractAddr) public {
    verifier = Verifier(_verifierContractAddr);
  }
  uint256 amount = uint256(1000000000000000000);
  uint256 root;
  uint256[] commitments;
  mapping(uint256 => bool) nullifiers;

  function deposit(
            uint256 _commitment,
            uint256 _root
  ) public payable {
    // TODO check root state transition update with zkp

    require(msg.value==amount, "value should be 1 ETH"); // this can be flexible with a wrapper with preset fixed amounts
    commitments.push(_commitment);
    root = _root;
  }

  function getCommitments() public view returns (uint256[] memory, uint256) {
    return (commitments, root);
  }

  function withdraw(
            address payable _address,
            uint256 nullifier,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public {

    uint256[5] memory input = [
      0,
      amount,
      nullifier,
      root,
      uint256(_address)
    ];
    require(verifier.verifyProof(a, b, c, input), "zkProof withdraw could not be verified");
    // zk verification passed
    require(useNullifier(nullifier), "nullifier already used");
    // nullifier check passed
    // proceed with the withdraw

    _address.send(amount);
    // _address.call.value(amount).gas(20317)();
  }

  function useNullifier(
    uint256 nullifier
  ) internal returns (bool) {
    if (nullifiers[nullifier]) {
      return false;
    }
    nullifiers[nullifier] = true;
    return true;
  }
}
