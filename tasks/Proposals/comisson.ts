import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao, i_face } from "../utils";

dotenv.config();

export default task("comission", "Get comission")
  .addParam("agreement", "Agreement to sending comission to owner")
  .setAction(async (taskArgs, hre) => {
    const iface = i_face(hre);
    const signature = iface.encodeFunctionData("getComission", [taskArgs.agreement as boolean]);
    const _dao = await dao(hre);
    await _dao.addProposal(process.env.PLATFORM as string, signature as string).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});