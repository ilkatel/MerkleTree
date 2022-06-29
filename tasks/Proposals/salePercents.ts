import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { dao, i_face } from "../utils";

dotenv.config();

export default task("salePercents", "Change sale refs percents")
  .addParam("percents", "New percents values")
  .setAction(async (taskArgs, hre) => {
    const percents = taskArgs.percents.split(",");
    const iface = i_face(hre);
    const signature = iface.encodeFunctionData("changeSaleRefPercents", [percents]);
    const _dao = await dao(hre);
    await _dao.addProposal(process.env.PLATFORM as string, signature as string).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});