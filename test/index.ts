import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { ACDMPlatform, ACDMPlatform__factory, DAO__factory, ERCTOKEN, ERCTOKEN__factory, Staking, Staking__factory } from "../typechain";
import { DummyRevert__factory } from "../typechain/factories/DummyRevert__factory";
import { add, getProof, getRoot, reset } from ".././back/queries/merkle";

let signer: SignerWithAddress;
let accs: SignerWithAddress[];
let uniswap: Contract;
let factory: Contract;
let router: Contract;
let pair: string;
let XXXtoken: ERCTOKEN;
let ACDMtoken: ERCTOKEN;
let ACDMplatform: ACDMPlatform;
let staking: Staking;
let dao: Contract;
const duration: number = 3*24*60*60;
const zeroHash = ethers.constants.HashZero;
const zeroAddress = ethers.constants.AddressZero;
let price = 1e7;


const ABI = [
  "function vote(uint256 _index, bool _agreement)",
  "function changeQuorum(uint _minimumQuorum)",
  "function changeDuration(uint _duration)",
  "function changePersonRights(address _user)",
  "function changeLockTime(uint _lockTime)",
  "function changeSaleRefPercents(uint[2] _percents)",
  "function changeTradeRefPercent(uint _percent)",
  "function getComission(bool _agreement)",
  "function updateRootHash(bytes32 _rootHash)"
];
const iface = new ethers.utils.Interface(ABI);


async function sleep(_duration: number) {
  await ethers.provider.send("evm_increaseTime", [_duration]);
  await ethers.provider.send("evm_mine", []);
}

async function timestamp() {
  return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
}


describe("Presets", function () {
  beforeEach(async function () {
    accs = await ethers.getSigners();
    signer = accs[0];

    // XXXToken ==============================================================================
    XXXtoken = await new ERCTOKEN__factory(signer).deploy("XXXToken", "XXX", 18);
    await XXXtoken.deployed();

    // Uniswap ===============================================================================
    factory = await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY as string);
    router = await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER as string);

    await XXXtoken.mint(signer.address, ethers.utils.parseEther("10000000"));
    await XXXtoken.approve(router.address, ethers.utils.parseEther("1000000"));

    await router.addLiquidityETH(
      XXXtoken.address,
      ethers.utils.parseEther("1000000"),
      100,
      100,
      signer.address,
      1e10,
      { value: ethers.utils.parseEther("100") }
    );
    pair = await factory.getPair(XXXtoken.address, await router.WETH());
    uniswap = await ethers.getContractAt("IUniswapV2Pair", pair);
    
    // DAO ===================================================================================
    dao = await new DAO__factory(signer).deploy(2, duration);
    await dao.deployed();
    
    // ACDMToken =============================================================================
    ACDMtoken = await new ERCTOKEN__factory(signer).deploy("ACDMToken", "ACDM", 6);
    await ACDMtoken.deployed();
    
    await ACDMtoken.mint(signer.address, ethers.utils.parseEther("10000000"));
    await ACDMtoken.mint(accs[3].address, ethers.utils.parseEther("10000000"));

    // ACDMPlatform ==========================================================================
    ACDMplatform = await new ACDMPlatform__factory(signer).deploy(ACDMtoken.address, dao.address, router.address, XXXtoken.address);
    await ACDMplatform.deployed();
    
    await ACDMtoken.changeRights(ACDMplatform.address);
    await ACDMtoken.approve(ACDMplatform.address, ethers.utils.parseEther("10000000"));
    await ACDMtoken.connect(accs[3]).approve(ACDMplatform.address, ethers.utils.parseEther("10000000"));

    // Staking ===============================================================================
    await reset();
    await add([
      signer.address,
      accs[1].address,
      accs[7].address,
      accs[8].address,
      accs[9].address
    ]);

    staking = await new Staking__factory(signer).deploy(dao.address, uniswap.address, XXXtoken.address, 10, 100, await getRoot());
    await staking.deployed();

    await uniswap.approve(staking.address, ethers.utils.parseEther("1000"));
    await XXXtoken.mint(staking.address, ethers.utils.parseEther("10000000"));
    
    // =======================================================================================
    await dao.setStaking(staking.address);
  });

  describe("Staking test", function () {
    it("onlyDAO: Reverted - Not dao", async function () {
      await expect(staking.changeLockTime(1)).to.be.revertedWith("DAO Only");
    });
    
    it("stake: Reverted - Zero amount", async function () {
      await expect(staking.stake(0, [])).to.be.revertedWith("Amount cant be null");
    });

    it("stake: Reverted - Have no whitelist", async function () {
      await expect(staking.connect(accs[2]).stake(10, [])).to.be.revertedWith("Have no whitelist");
    });

    it("stake: Success - Update unfreeze time", async function () {
      await expect(async () => staking.stake(10, await getProof(signer.address))).changeTokenBalances(uniswap, [staking, signer], [10, -10]);
      expect((await staking.staking(signer.address)).unfreeze).to.be.eq(await timestamp() + duration);
    });

    it("stake: Success - Not updating rewards", async function () {
      expect((await staking.staking(signer.address)).accumulated).to.be.eq(0);
      await expect(async () => staking.stake(1000, await getProof(signer.address))).changeTokenBalances(uniswap, [staking, signer], [1000, -1000]);
      expect((await staking.staking(signer.address)).accumulated).to.be.eq(0);
    });

    it("stake: Success - Updating rewards", async function () {
      expect((await staking.staking(signer.address)).accumulated).to.be.eq(0);
      await expect(async () => staking.stake(1000, await getProof(signer.address))).changeTokenBalances(uniswap, [staking, signer], [1000, -1000]);
      await sleep(100);
      await expect(async () => staking.stake(1, await getProof(signer.address))).changeTokenBalances(uniswap, [staking, signer], [1, -1]);
      expect((await staking.staking(signer.address)).accumulated).not.be.eq(0);
    });

    it("getRewards: Reverted - Not staking", async function () {
      await expect(staking.getRewards()).to.be.revertedWith("You not staking");
    });
    
    describe("", function () {
      beforeEach(async function () {
        await staking.stake(1000, await getProof(signer.address));
      });

      it("getRewards: Success - Nothing to get", async function () {
        await staking.getRewards();
      });

      it("getRewards: Success - Getting rewards", async function () {
        await sleep(100);
        await expect(() => staking.getRewards()).to.changeTokenBalances(XXXtoken, [staking, signer], [-101, 101]);
      });

      it("unstake: Reverted - Cant unstake yet", async function () {
        await expect(staking.unstake()).to.be.revertedWith("Cant unstake yet");
      });

      it("unstake: Success - Unstake tokens", async function () {
        await sleep(duration);
        await expect(() => staking.unstake()).to.changeTokenBalances(uniswap, [staking, signer], [-1000, 1000]);
      });

      it("staked: Success - Getting staked value", async function () {
        expect(await staking.staked(signer.address)).to.be.eq(1000);
      });
    });

  });

  describe("ACDMPlatform test", function () {
    it("register without referrals: Success - Register successfull", async function () {
      expect(await ACDMplatform.registered(signer.address)).to.be.eq(false);
      await ACDMplatform["register()"]();
      expect(await ACDMplatform.registered(signer.address)).to.be.eq(true);
    });
    
    it("register without referrals: Reverted - Already registered", async function () {
      await ACDMplatform["register()"]();
      await expect(ACDMplatform["register()"]()).to.be.revertedWith("Already registered");
    });

    it("register with referrals: Success - Register successfull", async function () {
      await ACDMplatform.connect(accs[1])["register()"]();
      await ACDMplatform.connect(accs[2])["register()"]();
      expect(await ACDMplatform.registered(signer.address)).to.be.eq(false);
      await ACDMplatform["register(address[])"]([accs[1].address, accs[2].address]);
      expect(await ACDMplatform.registered(signer.address)).to.be.eq(true);
      expect(await ACDMplatform.referrals(signer.address, 0)).to.be.eq(accs[1].address);
      expect(await ACDMplatform.referrals(signer.address, 1)).to.be.eq(accs[2].address);
    });

    it("register with referrals: Reverted - Already registered", async function () {
      await ACDMplatform.connect(accs[1])["register()"]();
      await ACDMplatform.connect(accs[2])["register()"]();
      await ACDMplatform["register(address[])"]([accs[1].address, accs[2].address]);
      await expect(ACDMplatform["register(address[])"]([accs[1].address, accs[2].address])).to.be.revertedWith("Already registered");
    });

    it("register with referrals: Reverted - Incorrect refs count", async function () {
      await expect(ACDMplatform["register(address[])"]([accs[1].address, accs[2].address, accs[3].address])).to.be.revertedWith("Incorrect referrals count");
    });

    it("register with referrals: Reverted - Ref not found", async function () {
      await expect(ACDMplatform["register(address[])"]([accs[1].address, accs[4].address])).to.be.revertedWith("Referral not found");
    });

    describe("", function () {
      beforeEach(async function () {
        await ACDMplatform.connect(accs[1])["register()"]();
        await ACDMplatform.connect(accs[2])["register()"]();
        await ACDMplatform.connect(accs[3])["register()"]();
        await ACDMplatform["register(address[])"]([accs[1].address, accs[2].address]);
        price = 1e7;
      });

      it("status: Success - Sale status on start", async function () {
        expect(await ACDMplatform.status()).to.be.eq(0);
      });
      
      it("registeredOnly: Reverted - Not registered", async function () {
        await expect(ACDMplatform.connect(accs[4])["buy(uint256)"](1, { value: price })).to.be.revertedWith("You are not registered");
      });

      it("onlyDAO: Reverted - Not dao call function", async function () {
        await expect(ACDMplatform.changeTradeRefPercent(1)).to.be.revertedWith("DAO only");
      });

      it("buy on sale: Reverted - Incorrect ETH value", async function () {
        await expect(ACDMplatform["buy(uint256)"](1, { value: 99 })).to.be.revertedWith("Incorrect ETH value");
      });

      it("buy on sale: Reverted - Amount exceeds allowed pool", async function () {
        await expect(ACDMplatform["buy(uint256)"](1e12, { value: ethers.utils.parseEther("10") })).to.be.revertedWith("Amount exceeds allowed pool");
      });

      it("buy on sale: Success - Buy without refs", async function () {
        await expect(() => ACDMplatform.connect(accs[1])["buy(uint256)"](1, { value: price })).changeEtherBalances([ACDMplatform, accs[1]], [price, -price]);
      });

      it("buy on sale: Success - Buy with refs", async function () {
        const acc1Payment = price * 0.05;
        const acc2Payment = price * 0.03;
        await expect(() => ACDMplatform["buy(uint256)"](1, { value: price })).changeEtherBalances([ACDMplatform, signer, accs[1], accs[2]], [price - acc1Payment - acc2Payment, -price, acc1Payment, acc2Payment]);
      });

      it("buy on sale: Success - Sale all pool and switch event", async function () {
        await ACDMplatform["buy(uint256)"](1e11, { value: ethers.utils.parseEther("1") });
        expect(await ACDMplatform.status()).to.be.eq(1);
      });

      it("transfer: Reverted - Receiver error", async function () {
        const dummy = await new DummyRevert__factory(signer).deploy(ACDMplatform.address);
        await dummy.deployed();
        await dummy.register();
        await ACDMplatform.connect(accs[9])["register(address[])"]([dummy.address]);
        await expect(ACDMplatform.connect(accs[9])["buy(uint256)"](1, { value: price })).to.be.revertedWith("ETH transfer failed");
      });

      it("switchEvent: Reverted - Cant switch yet", async function () {
        await expect(ACDMplatform.swithEvent()).to.be.revertedWith("Cant switch yet");
      });

      it("switchEvent: Success - Successfully switched on trade", async function () {
        await sleep(duration);
        await ACDMplatform.swithEvent();
        expect(await ACDMplatform.status()).to.be.eq(1);
      });

      it("eventOnly: Reverted - Event not active", async function () {
        await expect(ACDMplatform.list(1, 1)).to.be.revertedWith("Not active");
      });

      it("eventOnly: Reverted - Event closed", async function () {
        await sleep(duration);
        await expect(ACDMplatform["buy(uint256)"](1, { value: price })).to.be.revertedWith("Event closed");
      });

      describe("", function () {
        beforeEach(async function () {
          await sleep(duration);
          await ACDMplatform.swithEvent();
        });

        it("list: Reverted - Null price", async function () {
          await expect(ACDMplatform.list(10, 0)).to.be.revertedWith("Price cant be null");
        });

        it("list: Reverted - Null amount", async function () {
          await expect(ACDMplatform.list(0, 10)).to.be.revertedWith("Amount cant be null");
        });

        it("list: Success - List tokens", async function () {
          await expect(() => ACDMplatform.list(10, 10)).changeTokenBalances(ACDMtoken, [ACDMplatform, signer], [10, -10]);
        });

        it("cancel: Reverted - Not owner", async function () {
          await expect(ACDMplatform.cancel(0)).to.be.revertedWith("You are not an owner");
        });

        it("cancel: Success - Cancel tokens listing", async function () {
          await expect(() => ACDMplatform.list(10, 10)).changeTokenBalances(ACDMtoken, [ACDMplatform, signer], [10, -10]);
          await expect(() => ACDMplatform.cancel(0)).changeTokenBalances(ACDMtoken, [ACDMplatform, signer], [-10, 10]);
        });

        describe("", function () {
          beforeEach(async function () {
            await ACDMplatform.connect(accs[3]).list(10, 1000);
            price = 10 * 1000;
          });

          it("buy on trade: Reverted - Cant find lot", async function () {
            await expect(ACDMplatform["buy(uint256,uint256)"](10, 1)).to.be.revertedWith("Cant find lot");
          });

          it("buy on trade: Reverted - Amount exceeds allowed", async function () {
            await expect(ACDMplatform["buy(uint256,uint256)"](1000, 0)).to.be.revertedWith("Amount exceeds allowed");
          });

          it("buy on trade: Reverted - Inctorrect ETH value", async function () {
            await expect(ACDMplatform["buy(uint256,uint256)"](10, 0, { value: 0 })).to.be.revertedWith("Inctorrect ETH value");
          });

          it("buy on trade: Success - Successfull buy tokens", async function () {
            await expect(() => ACDMplatform["buy(uint256,uint256)"](10, 0, { value: price })).changeTokenBalances(ACDMtoken, [ACDMplatform, signer], [-10, 10]);
          });

          it("buy on trade: Success - Buy without refs", async function () {
            const payment = price * 0.025;
            await expect(() => ACDMplatform.connect(accs[1])["buy(uint256,uint256)"](10, 0, { value: price })).changeEtherBalances([ACDMplatform, accs[1], accs[3]], [2* payment, -price, price - 2*payment]);
          });

          it("buy on trade: Success - Buy with refs", async function () {
            const payment = price * 0.025;
            await expect(() => ACDMplatform["buy(uint256,uint256)"](10, 0, { value: price })).changeEtherBalances([ACDMplatform, signer, accs[1], accs[2], accs[3]], [0, -price, payment, payment, price - 2*payment]);
          });

          it("buy on trade: Success - Lot deleted", async function () {
            await expect(ACDMplatform["buy(uint256,uint256)"](10, 0, { value: price })).to.emit(ACDMplatform, "DelLot").withArgs(0);
          });

          it("buy on trade: Success - Lot changed", async function () {
            await expect(ACDMplatform["buy(uint256,uint256)"](5, 0, { value: price / 2 })).to.emit(ACDMplatform, "EditLot").withArgs(5, 0);
          });

          it("switchEvent: Success - Successfully switched on sale", async function () {
            await sleep(duration);
            await ACDMplatform.swithEvent();
            expect(await ACDMplatform.status()).to.be.eq(0);
          });
        });
      });
    });

  });

  describe("DAO test", function () {
    beforeEach(async function () {
      await XXXtoken.mint(accs[1].address, ethers.utils.parseEther("10000000"));
      await XXXtoken.connect(accs[1]).approve(router.address, ethers.utils.parseEther("1000000"));
      await router.connect(accs[1]).addLiquidityETH(
        XXXtoken.address,
        ethers.utils.parseEther("1000000"),
        100,
        100,
        accs[1].address,
        1e10,
        { value: ethers.utils.parseEther("100") }
      );
      // await add([accs[1].address]);
      await uniswap.connect(accs[1]).approve(staking.address, 100);
      await staking.connect(accs[1]).stake(100, await getProof(accs[1].address));
      await staking.stake(100, await getProof(signer.address));

    });

    it("setStaking: Reverted - Not owner", async function () {
      await expect(dao.connect(accs[1]).setStaking(staking.address)).to.be.revertedWith("Only owner");
    });

    it("addProposal: Reverted - Not chairperson", async function () {
      await expect(dao.connect(accs[1]).addProposal(zeroAddress, zeroHash)).to.be.revertedWith("You are not chairperson");
    });

    it("addProposal: Reverted - Null receiver address", async function () {
      await expect(dao.addProposal(zeroAddress, zeroHash)).to.be.revertedWith("Receiver address cant be null");
    });

    it("addProposal: Reverted - Incorrect function selector", async function () {
      await expect(dao.addProposal(dao.address, zeroHash)).to.be.revertedWith("Incorrect function selector");
    });

    it("addProposal: Success - Successfull add proposal", async function () {
      await dao.addProposal(dao.address, dao.address);
      expect((await dao.vp(0)).receiver).to.be.eq(dao.address);
    });

    describe("", function () {
      beforeEach(async function () {
        const signature = iface.encodeFunctionData("changePersonRights", [accs[1].address]);
        await dao.addProposal(dao.address, signature as string);
      });

      it("vote: Reverted - Cant find voting", async function () {
        await expect(dao.connect(accs[2]).vote(1, true)).to.be.revertedWith("Cant find voting");
      });

      it("vote: Reverted - Time is over", async function () {
        await sleep(duration);
        await expect(dao.connect(accs[2]).vote(0, true)).to.be.revertedWith("Time is over");
      });

      it("vote: Reverted - Have no tokens to vote", async function () {
        await expect(dao.connect(accs[2]).vote(0, true)).to.be.revertedWith("Have no tokens to vote");
      });

      it("vote: Reverted - Vote again", async function () {
        await dao.vote(0, true);
        await expect(dao.vote(0, true)).to.be.revertedWith("Cant vote again");
      });

      it("vote: Success - Update agree votes", async function () {
        expect((await dao.vp(0)).agreeVotes).to.be.eq(0);
        await dao.vote(0, true);
        expect((await dao.vp(0)).agreeVotes).to.be.eq(100);
      });

      it("vote: Success - Update disagree votes", async function () {
        expect((await dao.vp(0)).disagreeVotes).to.be.eq(0);
        await dao.vote(0, false);
        expect((await dao.vp(0)).disagreeVotes).to.be.eq(100);
      });

      it("vote: Success - Vote update staking freez time", async function () {
        const timeBefore = (await staking.staking(signer.address)).unfreeze;
        await dao.vote(0, false);
        const timeAfter = (await staking.staking(signer.address)).unfreeze;
        expect(timeAfter > timeBefore).to.be.eq(true);
      });

      it("finish: Reverted - Cant find voting", async function () {
        await expect(dao.finish(1)).to.be.reverted;
      });

      it("finish: Reverted - Cant finish voting yet", async function () {
        await expect(dao.finish(0)).to.be.revertedWith("Cant finish voting yet");
      });

      it("finish: Reverted - Already finished", async function () {
        await sleep(duration);
        await dao.finish(0);
        await expect(dao.finish(0)).to.be.revertedWith("Already finished");
      });

      it("finish: Reverted - Receiver error", async function () {
        const signature = iface.encodeFunctionData("vote", [0, true]);
        await dao.addProposal(dao.address, signature as string);
        await dao.vote(1, true);
        await dao.connect(accs[1]).vote(1, true);
        await sleep(duration);
        await expect(dao.finish(1)).to.be.revertedWith("Cant run it from this address");
      });

      it("finish: Success - Finish without execution", async function () {
        await sleep(duration);
        await dao.finish(0);
        expect(await dao.chairPersons(accs[1].address)).to.be.eq(false);
      });

      it("finish: Success - Finish with execution", async function () {
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(duration);
        await dao.finish(0);
        expect(await dao.chairPersons(accs[1].address)).to.be.eq(true);
      });

      it("delegate: Reverted - Voting time is over", async function () {
        await sleep(duration);
        await expect(dao.delegate(0, accs[1].address)).to.be.revertedWith("Time is over");
      });

      it("delegate: Reverted - Delegate to yourself", async function () {
        await expect(dao.delegate(0, signer.address)).to.be.revertedWith("Cant delegate to yourself");
      });

      it("delegate: Reverted - Cant find voting", async function () {
        await expect(dao.delegate(1, accs[1].address)).to.be.reverted;
      });

      it("delegate: Reverted - Nothing to delegate", async function () {
        await expect(dao.connect(accs[2].address).delegate(0, signer.address)).to.be.revertedWith("Nothing to delegate");
      });

      it("delegate: Reverted - Already voted", async function () {
        await dao.vote(0, true);
        await expect(dao.delegate(0, accs[1].address)).to.be.revertedWith("You already voted");
      });

      it("delegate: Reverted - Person already voted", async function () {
        await dao.connect(accs[1]).vote(0, true);
        await expect(dao.delegate(0, accs[1].address)).to.be.revertedWith("This person already voted");
      });

      it("delegate: Success - Successfull delegate", async function () {
        const timeBefore = (await staking.staking(signer.address)).unfreeze;
        await dao.delegate(0, accs[1].address);
        const timeAfter = (await staking.staking(signer.address)).unfreeze;
        expect(timeAfter > timeBefore).to.be.eq(true);
      });

      it("getBack: Reverted - Time is over", async function () {
        await sleep(duration);
        await expect(dao.getBack(0, accs[1].address)).to.be.revertedWith("Time is over");
      });

      it("getBack: Reverted - Person already voted", async function () {
        await dao.connect(accs[1]).vote(0, true);
        await expect(dao.getBack(0, accs[1].address)).to.be.revertedWith("This person already voted");
      });

      it("getBack: Reverted - Nothing to getting back", async function () {
        await expect(dao.getBack(0, accs[1].address)).to.be.revertedWith("Nothing to getting back");
      });

      it("getBack: Success - Getting back successfull", async function () {
        await dao.delegate(0, accs[1].address);
        await dao.getBack(0, accs[1].address);
      });

      it("changeQuorum: Success - Successfull changed quorum", async function () {
        await dao.changeQuorum(3);
        expect(await dao.minimumQuorum()).to.be.eq(3);
      });

      it("changeDuration: Success - Successfull changed duration", async function () {
        await dao.changeDuration(3);
        expect(await dao.debatingDuration()).to.be.eq(3);
      });

      it("changePersonRights: Success - Successfull changed person rights", async function () {
        await dao.changePersonRights(accs[1].address);
        expect(await dao.chairPersons(accs[1].address)).to.be.eq(true);
      });

      it("canChange: Reverted - Not chairperson", async function () {
        await expect(dao.connect(accs[1]).changePersonRights(accs[1].address)).to.be.revertedWith("Have no rights");
      });

      it("notThis: Reverted - Receiver error", async function () {
        const signature = iface.encodeFunctionData("vote", [0, true]);
        await dao.addProposal(dao.address, signature as string);
        await dao.vote(1, true);
        await dao.connect(accs[1]).vote(1, true);
        await sleep(duration);
        await expect(dao.finish(1)).to.be.revertedWith("Cant run it from this address");
      });
    });

    describe("Interact with DAO contract", function () {
      it("Staking | changeLockTime: Reverted - Cant be null", async function () {
        const signature = iface.encodeFunctionData("changeLockTime", [0]);
        await dao.addProposal(staking.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(duration);
        await expect(dao.finish(0)).to.be.revertedWith("Cant be null");
      });

      it("Staking | changeLockTime: Success - Successfull chnged lock time", async function () {
        const signature = iface.encodeFunctionData("changeLockTime", [100]);
        await dao.addProposal(staking.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(duration);
        await dao.finish(0);
        expect(await staking.lockTime()).to.be.eq(100);
      });

      it("Staking | updateFreezing: Success - Not update freezing time", async function () {
        await staking.stake(10, await getProof(signer.address));
        const freezing = (await staking.staking(signer.address)).unfreeze;
        await dao.changeDuration(5);
        const signature = iface.encodeFunctionData("changeLockTime", [100]);
        await dao.addProposal(staking.address, signature as string);
        await dao.vote(0, true);
        expect((await staking.staking(signer.address)).unfreeze).to.be.eq(freezing);
      });

      it("Staking | updateFreezing: Success - Update freezing time", async function () {
        await staking.stake(10, await getProof(signer.address));
        const freezing = (await staking.staking(signer.address)).unfreeze;
        await dao.changeDuration(duration + 100);
        const signature = iface.encodeFunctionData("changeLockTime", [100]);
        await dao.addProposal(staking.address, signature as string);
        await dao.vote(0, true);
        expect((await staking.staking(signer.address)).unfreeze).not.be.eq(freezing);
      });

      it("Staking | updateRootHash: Success - Update root hash", async function () {
        await add([accs[5].address]);
        const signature = iface.encodeFunctionData("updateRootHash", [await getRoot()]);
        await dao.addProposal(staking.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(duration);
        const rootBefore = await staking.rootHash();
        await dao.finish(0);
        const rootAfter = await staking.rootHash();
        expect(rootBefore).not.be.eq(rootAfter);
      });

      it("ACDM | changeSaleRefPercents: Reverted - Incorrect values", async function () {
        await dao.changeDuration(duration + 100);
        const signature = iface.encodeFunctionData("changeSaleRefPercents", [[100, 900]]);
        await dao.addProposal(ACDMplatform.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(2*duration);
        await expect(dao.finish(0)).to.be.revertedWith("Incorrect values");
      });

      it("ACDM | changeSaleRefPercents: Success - Successfull changed percents", async function () {
        await dao.changeDuration(duration + 100);
        const signature = iface.encodeFunctionData("changeSaleRefPercents", [[100, 150]]);
        await dao.addProposal(ACDMplatform.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(2*duration);
        await dao.finish(0);
        expect(await ACDMplatform.saleReferralPercents(0)).to.be.eq(BigNumber.from(100));
        expect(await ACDMplatform.saleReferralPercents(1)).to.be.eq(BigNumber.from(150));
      });

      it("ACDM | changeTradeRefPercent: Reverted - Incorrect value", async function () {
        await dao.changeDuration(duration + 100);
        const signature = iface.encodeFunctionData("changeTradeRefPercent", [500]);
        await dao.addProposal(ACDMplatform.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(2*duration);
        await expect(dao.finish(0)).to.be.revertedWith("Incorrect value");
      });

      it("ACDM | changeTradeRefPercent: Success - Successfull changed percents", async function () {
        await dao.changeDuration(duration + 100);
        const signature = iface.encodeFunctionData("changeTradeRefPercent", [150]);
        await dao.addProposal(ACDMplatform.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(2*duration);
        await dao.finish(0);
        expect(await ACDMplatform.tradeReferralPercent()).to.be.eq(150);
      });

      it("ACDM | getComission: Success - Getting comission to owner", async function () {
        await ACDMplatform["register()"]();
        await ACDMplatform["buy(uint256)"](1, { value: 1e7 })
        const signature = iface.encodeFunctionData("getComission", [true]);
        await dao.addProposal(ACDMplatform.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(2*duration);
        await expect(() => dao.finish(0)).changeEtherBalances([ACDMplatform, signer], [-1e7, 1e7]);
      });

      it("ACDM | getComission: Success - Burn comission to tokens", async function () {
        await ACDMplatform["register()"]();
        await ACDMplatform["buy(uint256)"](1, { value: 1e7 })
        const signature = iface.encodeFunctionData("getComission", [false]);
        await dao.addProposal(ACDMplatform.address, signature as string);
        await dao.vote(0, true);
        await dao.connect(accs[1]).vote(0, true);
        await sleep(2*duration);
        await expect(() => dao.finish(0)).changeEtherBalances([ACDMplatform, signer], [-1e7, 0]);
      });
    });
  });
});