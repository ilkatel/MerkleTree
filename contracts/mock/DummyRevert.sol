//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IACDM.sol";

contract DummyRevert {

    address public ACDMPlatform;

    constructor(address _ACDMPlatform) {
        ACDMPlatform = _ACDMPlatform;
    }   

    function register() external {
        IACDM(ACDMPlatform).register();
    }

    receive() external payable {
        revert("Error");
    }
}