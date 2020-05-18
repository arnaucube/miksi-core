pragma solidity ^0.6.0;

import './deposit-verifier.sol';
import './withdraw-verifier.sol';

contract Miksi {
  DepositVerifier    dVerifier;
  WithdrawVerifier    wVerifier;

  uint256 key = 0;
  uint256 amount = uint256(1000000000000000000);
  uint256 root ;
  uint256[] commitments;
  mapping(uint256 => bool) nullifiers;

  constructor( address _depositVerifierContractAddr, address _withdrawVerifierContractAddr) public {
    dVerifier = DepositVerifier(_depositVerifierContractAddr);
    wVerifier = WithdrawVerifier(_withdrawVerifierContractAddr);
    root = uint256(7191590165524151132621032034309259185021876706372059338263145339926209741311);
  }

  function deposit(
            uint256 _commitment,
            uint256 _root,
            uint[2] memory a,
            uint[2][2] memory b,
            uint[2] memory c
  ) public payable {
    // check root state transition update with zkp
    uint256[6] memory input = [
      0,
      msg.value,
      root, // rootOld
      _root, // rootNew
      _commitment,
      key+1
    ];
    require(dVerifier.verifyProof(a, b, c, input), "zkProof deposit could not be verified");

    require(msg.value==amount, "value should be 1 ETH"); // this can be flexible with a wrapper with preset fixed amounts
    commitments.push(_commitment);
    root = _root;
    key += 1;
  }

  function getCommitments() public view returns (uint256[] memory, uint256, uint256) {
    return (commitments, root, key+1);
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
    require(wVerifier.verifyProof(a, b, c, input), "zkProof withdraw could not be verified");
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
