import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao } from "../utils";

dotenv.config();

export default task("getBack", "Get delegated votes back")
  .addParam("index", "Proposal index")
  .addParam("from", "Account address")
  .setAction(async (taskArgs, hre) => {
    const _dao = await dao(hre);
    await _dao.getBack(taskArgs.index, taskArgs.from).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});