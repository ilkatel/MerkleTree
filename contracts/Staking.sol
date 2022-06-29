//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IERC20Mintable.sol";
import "./interfaces/IStaking.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Staking is IStaking {

    struct StakingInfo {
        uint256 staked;
        uint256 accumulated;
        uint256 unfreeze;
        uint256 startStaking;
    }

    IERC20Mintable public immutable stakeToken;
    IERC20Mintable public immutable rewardToken;
    address public dao;
    uint256 public immutable rewardPercent;
    uint256 public immutable rewardInterval;
    uint256 public lockTime;
    bytes32 public rootHash;

    mapping(address => StakingInfo) public staking;

    constructor(address _dao, address _stakeToken, address _rewardToken, uint256 _percent, uint256 _interval, bytes32 _rootHash) {
        dao = _dao; 
        stakeToken = IERC20Mintable(_stakeToken);
        rewardToken = IERC20Mintable(_rewardToken);
        rewardPercent = _percent;
        rewardInterval = _interval;
        rootHash = _rootHash;
        lockTime = 3 days;
    }   

    modifier onlyDAO () {
        require(msg.sender == dao, "DAO Only");
        _;
    }

    function _updateRewards(address _from) internal {
        if (rewardInterval < block.timestamp - staking[_from].startStaking)
            staking[_from].accumulated += (staking[_from].staked * rewardPercent / 100) * (block.timestamp - staking[_from].startStaking) / rewardInterval;
        staking[_from].startStaking = block.timestamp;
    }

    function stake(uint256 _amount, bytes32[] calldata proof) external {
        require(_amount > 0, "Amount cant be null");
        require(MerkleProof.verify(proof, rootHash, keccak256(abi.encodePacked(msg.sender))), "Have no whitelist");
        
        address _sender = msg.sender;
        stakeToken.transferFrom(_sender, address(this), _amount);

        _updateRewards(_sender);
        staking[_sender].staked += _amount;
        if (lockTime + block.timestamp > staking[_sender].unfreeze)
            staking[_sender].unfreeze = lockTime + block.timestamp;
    }

    function getRewards() public {
        address _sender = msg.sender;
        require(staking[_sender].staked > 0, "You not staking");

        _updateRewards(_sender);
        uint256 amount = staking[_sender].accumulated;

        if (amount > 0) {
            staking[_sender].accumulated = 0;
            rewardToken.transfer(_sender, amount);
        }
    }

    function unstake() external {
        address _sender = msg.sender;
        require(staking[_sender].unfreeze < block.timestamp, "Cant unstake yet");

        getRewards();
        uint amount = staking[_sender].staked;
        staking[_sender].staked = 0;
        stakeToken.transfer(_sender, amount);
    }

    function changeLockTime(uint256 _lockTime) external onlyDAO {
        require(_lockTime > 0, "Cant be null");
        lockTime = _lockTime;
    }

    function updateFreezing(address _staker, uint256 _unfreeze) external override onlyDAO {
        if (_unfreeze > staking[_staker].unfreeze) staking[_staker].unfreeze = _unfreeze;
    }

    function updateRootHash(bytes32 _rootHash) external onlyDAO {
        rootHash = _rootHash;
    }

    function staked(address _from) external view override returns (uint256) {
        return staking[_from].staked;
    }
}