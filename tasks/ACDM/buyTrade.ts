import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { platform } from "../utils";
import { find } from "../../back/queries/db";

dotenv.config();

export default task("buyTrade", "Buy tokens on trade")
  .addParam("amount", "Tokens amount")
  .addParam("price", "Max price")
  .setAction(async (taskArgs, hre) => {
    let result = await find(hre.ethers.BigNumber.from(taskArgs.amount), hre.ethers.BigNumber.from(taskArgs.price));
    console.log(`path: ${result}`);
    
    const _platform = await platform(hre);
    for (let res of result) {
      const tx = await _platform["buy(uint256,uint256)"](res[1], res[0], { value: res[1].mul(res[2]) })
        .then((result: tx) => console.log(`tx hash: ${result.hash}`));
  }
});