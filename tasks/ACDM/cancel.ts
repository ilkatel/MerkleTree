import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { platform } from "../utils";

dotenv.config();

export default task("cancel", "Cancel trade lot")
  .addParam("index", "Lot index")
  .setAction(async (taskArgs, hre) => {
    const _platform = await platform(hre);
    await _platform.cancel(taskArgs.index).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});