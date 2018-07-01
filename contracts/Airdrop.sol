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

  function deliverTokens(address[] receivers, uint256 amount) external onlyOwner {
    for (uint256 i = 0; i < receivers.length; i++) {
      _deliverTokens(receivers[i], amount);
    }
  }

  function deliverTokens(address[] receivers, uint256[] amount) external onlyOwner {
    for (uint256 i = 0; i < receivers.length; i++) {
      _deliverTokens(receivers[i], amount[i]);
    }
  }

  function _deliverTokens(address receiver, uint256 amount) internal {
    if ((receiver != address(0)) && (amount != 0) && (amount <= token.balanceOf(this))) {
      token.transfer(receiver, amount);
      emit TokenTransferred(receiver, amount);
    } else {
      emit FailedTransfer(receiver, amount);
    }
  }

  function destroy() onlyOwner public {
    _deliverTokens(owner, token.balanceOf(this));
    selfdestruct(owner);
  }
}
