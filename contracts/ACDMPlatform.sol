//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IERC20Mintable.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract ACDMPlatform {

    event AddLot(uint256 indexed _amount, uint256 indexed _price, uint256 indexed _index);
    event EditLot(uint256 indexed _amount, uint256 indexed _index);
    event DelLot(uint256 indexed _index);

    enum Status {sale, trade}

    // Sale =======================
    uint256 public salePrice;
    uint256 public salePool;
    uint256[2] public saleReferralPercents;
    // ============================

    // Trade =======================
    struct Trade {
        address trader;
        uint256 amount;
        uint256 price;
    }
    mapping(uint256 => Trade) public lots;
    uint256 public lotIndex;
    uint256 public tradeReferralPercent;
    uint256 public tradesPool;
    // ============================

    // Other ======================
    address public immutable owner;
    address public immutable dao;
    IERC20Mintable public immutable token;
    IUniswapV2Router02 public immutable uniswap;

    mapping(address => address[]) public referrals;
    mapping(address => bool) public registered;

    uint256 constant public DURATION = 3 days;
    uint256 public endTime;
    Status public status;

    address[] public path;
    // ============================
    
    constructor(address _token, address _dao, address _uniswap, address _xxxtoken) {
        owner = msg.sender;
        dao = _dao;
        uniswap = IUniswapV2Router02(_uniswap);
        token = IERC20Mintable(_token);

        salePool = 1e11;
        salePrice = 1e7;
        saleReferralPercents = [50, 30];
        tradeReferralPercent = 25;
        endTime = DURATION + block.timestamp;

        path.push(IUniswapV2Router02(_uniswap).WETH());
        path.push(_xxxtoken);
    }   

    modifier eventOnly(Status _event) {
        require(status == _event, "Not active");
        require(endTime > block.timestamp, "Event closed");
        _;
    }

    modifier onlyDAO {
        require(msg.sender == dao, "DAO only");
        _;
    }

    modifier registeredOnly() {
        require(registered[msg.sender], "You are not registered");
        _;
    }

    function register() external {
        require(!registered[msg.sender], "Already registered");
        registered[msg.sender] = true;
    }

    function register(address[] memory _referrals) external {
        require(!registered[msg.sender], "Already registered");
        require(_referrals.length < 3, "Incorrect referrals count");
        
        for (uint256 i; i < _referrals.length; i++) {
            require(registered[_referrals[i]], "Referral not found");
            referrals[msg.sender].push(_referrals[i]);
        }

        registered[msg.sender] = true;
    }

    function buy(uint256 _amount) external payable registeredOnly eventOnly(Status.sale) {
        require(salePrice * _amount == msg.value, "Incorrect ETH value");
        require(_amount <= salePool, "Amount exceeds allowed pool");

        salePool -= _amount;
        token.mint(msg.sender, _amount);
        for (uint256 i; i < referrals[msg.sender].length; i++)
            _transfer(referrals[msg.sender][i], msg.value * saleReferralPercents[i] / 1000);
        
        if (salePool == 0) _swithTrade();
    }

    function _transfer(address _to, uint256 _amount) internal {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "ETH transfer failed");
    }

    function list(uint256 _amount, uint256 _price) external registeredOnly eventOnly(Status.trade) {
        require(_price > 0, "Price cant be null");
        require(_amount > 0, "Amount cant be null");

        token.transferFrom(msg.sender, address(this), _amount);
        lots[lotIndex] = Trade({
            trader: msg.sender,
            amount: _amount,
            price: _price
        });

        emit AddLot(_amount, _price, lotIndex++);
    }

    function cancel(uint256 _index) external registeredOnly {
        require(lots[_index].trader == msg.sender, "You are not an owner");
        
        uint256 _amount = lots[_index].amount;

        delete lots[_index];
        token.transfer(msg.sender, _amount);
        emit DelLot(_index);
    }

    function buy(uint256 _amount, uint256 _index) external payable registeredOnly eventOnly(Status.trade) {
        require(lots[_index].trader != address(0), "Cant find lot");
        require(_amount <= lots[_index].amount, "Amount exceeds allowed");
        require(msg.value == _amount * lots[_index].price, "Inctorrect ETH value");

        lots[_index].amount -= _amount;
        tradesPool += _amount;

        token.transfer(msg.sender, _amount);
        uint256 value = msg.value;
        for (uint256 i; i < 2; i++) {
            uint256 comission = msg.value * tradeReferralPercent / 1000;
            value -= comission;
            if (referrals[msg.sender].length > i) _transfer(referrals[msg.sender][i], comission);
        }
        _transfer(lots[_index].trader, value);

        if (lots[_index].amount == 0) {
            delete lots[_index];
            emit DelLot(_index);
        } else emit EditLot(lots[_index].amount, _index);
    }

    function _swithTrade() internal {
        status = Status.trade;
        endTime = block.timestamp + DURATION;
    }

    function swithEvent() external {
        require(endTime < block.timestamp, "Cant switch yet");
        if (status == Status.sale) _swithTrade();
        else {
            status = Status.sale;
            salePrice = salePrice * 103 / 100 + 4e6;
            salePool = tradesPool / salePrice;
            tradesPool = 0;
            endTime = block.timestamp + DURATION;
        }
    }

    function changeSaleRefPercents(uint256[2] memory _percents) external onlyDAO {
        require(_percents[0] + _percents[1] + 500 < 1000, "Incorrect values");
        saleReferralPercents = _percents;
    }

    function changeTradeRefPercent(uint256 _percent) external onlyDAO {
        require(_percent < 250, "Incorrect value");
        tradeReferralPercent = _percent;
    }

    function getComission(bool _agreement) external onlyDAO {
        if (_agreement) _transfer(owner, address(this).balance);
        else {
            uniswap.swapExactETHForTokens{ value: address(this).balance }(
                0,
                path,
                address(this),
                block.timestamp + 1e5
            );
        }
    }
}