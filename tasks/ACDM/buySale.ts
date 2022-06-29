import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { getSalePrice, platform } from "../utils";

dotenv.config();

export default task("buySale", "Buy tokens on sale")
  .addParam("amount", "Tokens amount")
  .setAction(async (taskArgs, hre) => {
    const _platform = await platform(hre);
    const _amount = hre.ethers.BigNumber.from(taskArgs.amount);
    const _value = _amount.mul(await getSalePrice(hre));
    await _platform["buy(uint256)"](_amount, { value: _value }).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});