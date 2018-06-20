pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract Airdrop is Ownable {
  ERC20 token;

  event TokenTransferred(address indexed to, uint256 amount);
  event FailedTransfer(address indexed to, uint256 amount);

  constructor(ERC20 _token) public {
    require(_token != address(0));

    token = _token;
  }

  // function() external payable {
  // }

  function deliverTokens(address[] addrs, uint256 amount) external onlyOwner {
    for (uint256 i = 0; i < addrs.length; i++) {
      _deliverTokens(addrs[i], amount);
    }
  }

  function deliverTokens(address[] addrs, uint256[] amount) external onlyOwner {
    for (uint256 i = 0; i < addrs.length; i++) {
      _deliverTokens(addrs[i], amount[i]);
    }
  }

  function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
    if ((beneficiary != address(0)) && (tokenAmount != 0) && (tokenAmount <= token.balanceOf(this))) {
      token.transfer(beneficiary, tokenAmount);
      emit TokenTransferred(beneficiary, tokenAmount);
    } else {
      emit FailedTransfer(beneficiary, tokenAmount);
    }
  }

  function destroy() onlyOwner public {
    _deliverTokens(owner, token.balanceOf(this));
    selfdestruct(owner);
  }
}
