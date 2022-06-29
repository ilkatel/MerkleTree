import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { platform } from "../utils";

dotenv.config();

export default task("registerWR", "Register with refs")
  .addParam("refs", "Referrals")
  .setAction(async (taskArgs, hre) => {
    let refs = taskArgs.refs.split(",");
    const _platform = await platform(hre);
    await _platform["register(address[])"](refs).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});