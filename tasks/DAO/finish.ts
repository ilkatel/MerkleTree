import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao } from "../utils";

dotenv.config();

export default task("finish", "Finish proposal")
  .addParam("index", "Proposal index")
  .setAction(async (taskArgs, hre) => {
    const _dao = await dao(hre);
    await _dao.finish(taskArgs.index).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});