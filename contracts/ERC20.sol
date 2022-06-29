//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERCTOKEN is IERC20Mintable, ERC20, Ownable {

    uint8 internal immutable _decimals;
    mapping(address => bool) public minters;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) 
    ERC20(name_, symbol_) {
        _decimals = decimals_;
        minters[_msgSender()] = true;
    }   

    modifier onlyMinter() {
        require(minters[_msgSender()], "Have no rights");
        _;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    function changeRights(address _account) external onlyOwner {
        minters[_account] = !minters[_account];
    }

    function mint(address _account, uint _amount) external override onlyMinter {
        _mint(_account, _amount);
    }

    function burn(address _account, uint _amount) external override onlyMinter {
         _burn(_account, _amount);
    }
}