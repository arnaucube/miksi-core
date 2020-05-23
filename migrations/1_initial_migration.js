var Migrations = artifacts.require("./test/build/helpers/Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
