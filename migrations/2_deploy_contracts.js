const DepositVerifier = artifacts.require("../contracts/DepositVerifier");
const WithdrawVerifier = artifacts.require("../contracts/WithdrawVerifier");

module.exports = function(deployer) {
  deployer.deploy(DepositVerifier);
  deployer.deploy(WithdrawVerifier);
};
