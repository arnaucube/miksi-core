const DepositVerifier = artifacts.require("../test/build/DepositVerifier");
const WithdrawVerifier = artifacts.require("../test/build/WithdrawVerifier");

module.exports = function(deployer) {
  deployer.deploy(DepositVerifier);
  deployer.deploy(WithdrawVerifier);
};
