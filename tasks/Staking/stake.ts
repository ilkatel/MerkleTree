import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { staking, XXXtoken } from "../utils";
import { getProof } from "../../back/queries/merkle";

dotenv.config();

export default task("stake", "Stake XXXTokens")
  .addParam("amount", "Tokens amount")
  .setAction(async (taskArgs, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const _staking = await staking(hre);
    const _xxxtoken = await XXXtoken(hre);
    await _xxxtoken.approve(_staking.address, taskArgs.amount);
    await _staking.stake(taskArgs.amount, await getProof(signer.address)).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});