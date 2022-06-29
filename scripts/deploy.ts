import { ethers } from "hardhat";
import { ACDMPlatform__factory, DAO__factory, ERCTOKEN__factory, Staking__factory } from "../typechain";
import { run } from "hardhat";
import { add, reset, getRoot } from ".././back/queries/merkle";

const duration = 24*3*3600;

async function delpoy() {
  const [signer] = await ethers.getSigners();

  // // XXXToken ==============================================================================
  // const XXXtoken = await new ERCTOKEN__factory(signer).deploy("XXXToken", "XXX", 18);
  // await XXXtoken.deployed();
  // console.log(`XXXtoken deployed to: ${XXXtoken.address}`);

  // // Uniswap ===============================================================================
  // const factory = await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY as string, signer);
  // const router = await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER as string, signer);

  // await XXXtoken.mint(signer.address, ethers.utils.parseEther("1000"));
  // await XXXtoken.approve(router.address, ethers.utils.parseEther("1000"));

  // const tx = await router.addLiquidityETH(
  //   XXXtoken.address,
  //   ethers.utils.parseEther("1000"),
  //   100,
  //   100,
  //   signer.address,
  //   1e10,
  //   { value: ethers.utils.parseEther("0.1") }
  // );
  // await tx.wait();
  
  // const pair = await factory.getPair(XXXtoken.address, await router.WETH());
  // const uniswap = await ethers.getContractAt("IUniswapV2Pair", pair, signer);
  // console.log(`Getted pair at: ${uniswap.address}`);
  
  // // DAO ===================================================================================
  // const dao = await new DAO__factory(signer).deploy(2, duration);
  // await dao.deployed();
  // console.log(`DAO deployed to: ${dao.address}`);
  
  // // ACDMToken =============================================================================
  // const ACDMtoken = await new ERCTOKEN__factory(signer).deploy("ACDMToken", "ACDM", 6);
  // await ACDMtoken.deployed();
  // console.log(`ACDMToken deployed to: ${ACDMtoken.address}`);

  // await ACDMtoken.mint(signer.address, ethers.utils.parseEther("10000000"));

  // // ACDMPlatform ==========================================================================
  // const ACDMplatform = await new ACDMPlatform__factory(signer).deploy(ACDMtoken.address, dao.address, router.address, XXXtoken.address);
  // await ACDMplatform.deployed();
  // console.log(`ACDMPlatform deployed to: ${ACDMplatform.address}`);

  // await ACDMtoken.changeRights(ACDMplatform.address);
  // await ACDMtoken.approve(ACDMplatform.address, ethers.utils.parseEther("10000000"));
  
  // // Staking ===============================================================================
  // await reset();
  // await add([
  //   signer.address,
  //   process.env.ACC1 as string,
  //   process.env.ACC2 as string
  // ]);

  // const staking = await new Staking__factory(signer).deploy(dao.address, uniswap.address, XXXtoken.address, 10, 1000, await getRoot());
  // await staking.deployed();
  // console.log(`Staking deployed to: ${staking.address}`);

  // await uniswap.approve(staking.address, ethers.utils.parseEther("1000"));
  // await XXXtoken.mint(staking.address, ethers.utils.parseEther("10000000"));
  
  // // =======================================================================================
  // await dao.setStaking(staking.address);

  
  // // Verify ================================================================================
  // await run("verify:verify", {
  //   address: XXXtoken.address,
  //   constructorArguments: ["XXXToken", "XXX", 18],
  // });

  // await run("verify:verify", {
  //   address: dao.address,
  //   constructorArguments: [2, duration],
  // });

  // await run("verify:verify", {
  //   address: ACDMtoken.address,
  //   constructorArguments: ["ACDMToken", "ACDM", 6],
  // });

  // await run("verify:verify", {
  //   address: ACDMplatform.address,
  //   constructorArguments: [ACDMtoken.address, dao.address, router.address, XXXtoken.address],
  // });

  // await run("verify:verify", {
  //   address: staking.address,
  //   constructorArguments: [dao.address, uniswap.address, XXXtoken.address, 10, 1000, await getRoot()],
  // });


  const XXXtoken = await ethers.getContractAt("ERCTOKEN", "0x82201CF046391b5eF764749AD2f992eaD6857191", signer);

  const factory = await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY as string, signer);
  const router = await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER as string, signer);
  const pair = await factory.getPair(XXXtoken.address, await router.WETH());
  const uniswap = await ethers.getContractAt("IUniswapV2Pair", pair, signer);


  const dao = await ethers.getContractAt("DAO", "0xA16e58f9cCbf8FD75FCF97FB69eEcB49DA2b55e1", signer);
  
  await reset();
  await add([
    signer.address,
    process.env.ACC1 as string,
    process.env.ACC2 as string
  ]);

  const staking = await new Staking__factory(signer).deploy(dao.address, uniswap.address, XXXtoken.address, 10, 1000, await getRoot());
  await staking.deployed();
  console.log(`Staking deployed to: ${staking.address}`);

  await uniswap.approve(staking.address, ethers.utils.parseEther("1000"));
  await XXXtoken.mint(staking.address, ethers.utils.parseEther("10000000"));
  
  // =======================================================================================
  await dao.setStaking(staking.address);


  await run("verify:verify", {
    address: staking.address,
    constructorArguments: [dao.address, uniswap.address, XXXtoken.address, 10, 1000, await getRoot()],
  });
}

delpoy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
