#!/bin/sh

# npm install
rm -r build
mkdir build
cd build

compile_and_ts() {
  echo $(date +"%T") "circom ../circuits/$CIRCUIT.circom --r1cs --wasm --sym"
  itime="$(date -u +%s)"
  ../node_modules/.bin/circom ../circuits/$CIRCUIT.circom --r1cs --wasm --sym
  ftime="$(date -u +%s)"
  echo "	($(($(date -u +%s)-$itime))s)"

  echo $(date +"%T") "snarkjs info -r $CIRCUIT.r1cs"
  ../node_modules/.bin/snarkjs info -r $CIRCUIT.r1cs

  echo $(date +"%T") "snarkjs setup"
  itime="$(date -u +%s)"
  ../node_modules/.bin/snarkjs setup -r $CIRCUIT.r1cs --pk $CIRCUIT-proving_key.json --vk $CIRCUIT-verification_key.json
  echo "	($(($(date -u +%s)-$itime))s)"
  echo $(date +"%T") "trusted setup generated"

  # sed -i 's/null/["0","0","0"]/g' proving_key.json


  echo $(date +"%T") "snarkjs generateverifier"
  itime="$(date -u +%s)"
  ../node_modules/.bin/snarkjs generateverifier --vk $CIRCUIT-verification_key.json -v $CIRCUIT-verifier.sol
  echo "	($(($(date -u +%s)-$itime))s)"
  echo $(date +"%T") "generateverifier generated"

  sed -i "s/solidity ^0.5.0/solidity ^0.6.0/g" ${CIRCUIT}-verifier.sol
  sed -i "s/gas/gas()/g" ${CIRCUIT}-verifier.sol
  sed -i "s/return the sum/return r the sum/g" ${CIRCUIT}-verifier.sol
  sed -i "s/return the product/return r the product/g" ${CIRCUIT}-verifier.sol
  sed -i "s/contract Verifier/contract ${CONTRACT}Verifier/g" ${CIRCUIT}-verifier.sol
  sed -i "s/Pairing/${CONTRACT}Pairing/g" ${CIRCUIT}-verifier.sol
  cp ${CIRCUIT}-verifier.sol ../contracts/
}

CIRCUIT="deposit"
CONTRACT="Deposit"
compile_and_ts
CIRCUIT="withdraw"
CONTRACT="Withdraw"
compile_and_ts
