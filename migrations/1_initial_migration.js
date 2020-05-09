var Migrations = artifacts.require("./contracts/helpers/Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
