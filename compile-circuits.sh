#!/bin/sh

# npm install
rm -r build
mkdir build
cd build

echo $(date +"%T") "circom ../circuits/withdraw.circom --r1cs --wasm --sym"
itime="$(date -u +%s)"
../node_modules/.bin/circom ../circuits/withdraw.circom --r1cs --wasm --sym
ftime="$(date -u +%s)"
echo "	($(($(date -u +%s)-$itime))s)"

echo $(date +"%T") "snarkjs info -r withdraw.r1cs"
../node_modules/.bin/snarkjs info -r withdraw.r1cs

echo $(date +"%T") "snarkjs setup"
itime="$(date -u +%s)"
../node_modules/.bin/snarkjs setup -r withdraw.r1cs
echo "	($(($(date -u +%s)-$itime))s)"
echo $(date +"%T") "trusted setup generated"

# sed -i 's/null/["0","0","0"]/g' proving_key.json


echo $(date +"%T") "snarkjs generateverifier"
itime="$(date -u +%s)"
../node_modules/.bin/snarkjs generateverifier
echo "	($(($(date -u +%s)-$itime))s)"
echo $(date +"%T") "generateverifier generated"

sed -i "s/solidity ^0.5.0/solidity ^0.6.0/g" verifier.sol
sed -i "s/gas/gas()/g" verifier.sol
sed -i "s/return the sum/return r the sum/g" verifier.sol
sed -i "s/return the product/return r the product/g" verifier.sol
cp verifier.sol ../contracts/verifier.sol
