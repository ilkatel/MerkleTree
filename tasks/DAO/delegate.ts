import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao } from "../utils";

dotenv.config();

export default task("delegate", "Delegate votes")
  .addParam("index", "Proposal index")
  .addParam("to", "Account address")
  .setAction(async (taskArgs, hre) => {
    const _dao = await dao(hre);
    await _dao.delegate(taskArgs.index, taskArgs.to).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});