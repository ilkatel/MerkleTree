import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao } from "../utils";

dotenv.config();

export default task("addProposal", "Add new proposal")
  .addParam("receiver", "Receiver address")
  .addParam("signature", "Function signature")
  .setAction(async (taskArgs, hre) => {
    const _dao = await dao(hre);
    await _dao.addProposal(taskArgs.receiver, taskArgs.signature).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});