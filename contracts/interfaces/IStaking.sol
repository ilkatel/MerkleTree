//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStaking {
    function updateFreezing(address _staker, uint256 _unfreeze) external;
    function staked(address _from) external view returns (uint256);
}