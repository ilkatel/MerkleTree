import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { ACDMtoken, platform } from "../utils";

dotenv.config();

export default task("list", "List tokens")
  .addParam("amount", "Tokens amount")
  .addParam("price", "Token price")
  .setAction(async (taskArgs, hre) => {
    const _platform = await platform(hre);
    const _ACDMtoken = await ACDMtoken(hre);
    await _ACDMtoken.approve(_platform.address, taskArgs.amount);
    await _platform.list(taskArgs.amount, taskArgs.price).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});