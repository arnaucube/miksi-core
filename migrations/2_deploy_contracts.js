const Verifier = artifacts.require("../contracts/Verifier");

module.exports = function(deployer) {
  deployer.deploy(Verifier);
};
