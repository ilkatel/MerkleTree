import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { platform } from "../utils";

dotenv.config();

export default task("swicth", "Switch event")
  .setAction(async (_, hre) => {
    const _platform = await platform(hre);
    await _platform.swithEvent().then((result: tx) => console.log(`tx hash: ${result.hash}`));
});