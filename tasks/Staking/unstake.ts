import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { staking } from "../utils";

dotenv.config();

export default task("unstake", "Unstake tokens")
  .setAction(async (_, hre) => {
    const _staking = await staking(hre);
    await _staking.unstake().then((result: tx) => console.log(`tx hash: ${result.hash}`));
});