var Airdrop = artifacts.require('./Airdrop.sol')

module.exports = function(deployer) {
  deployer.deploy(Airdrop, '0xfFF9C805F14E34664ADDC108a30BCC2034cA4a87')
}
