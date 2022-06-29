import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao } from "../utils";

dotenv.config();

export default task("vote", "Vote to proposal")
  .addParam("index", "Proposal index")
  .addParam("agrement", "Your agreement")
  .setAction(async (taskArgs, hre) => {
    const _dao = await dao(hre);
    await _dao.vote(taskArgs.index, taskArgs.agreement).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});