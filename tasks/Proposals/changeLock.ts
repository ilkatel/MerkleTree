import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao, i_face } from "../utils";

dotenv.config();

export default task("changeLock", "Change Staking lock time")
  .addParam("time", "New lock time value")
  .setAction(async (taskArgs, hre) => {
    const iface = i_face(hre);
    const signature = iface.encodeFunctionData("changeLockTime", [taskArgs.time]);
    const _dao = await dao(hre);
    await _dao.addProposal(process.env.STAKING as string, signature as string).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});