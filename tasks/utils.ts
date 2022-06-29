import * as dotenv from "dotenv";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment as hh} from "hardhat/types";

dotenv.config();

const ABI = [
    "function getComission(bool _agreement)",
    "function changeTradeRefPercent(uint _percent)",
    "function changeSaleRefPercents(uint[2] _percents)",
    "function changeLockTime(uint _lockTime)",
    "function updateRootHash(bytes32 _rootHash)"
];

export async function _signer(hre: hh) {
    const [signer] = await hre.ethers.getSigners();
    return signer;
}

export async function XXXtoken(hre: hh) {
    return await hre.ethers.getContractAt("ERCTOKEN", process.env.XXXTOKEN as string, await _signer(hre));
}

export async function ACDMtoken(hre: hh) {
    return await hre.ethers.getContractAt("ERCTOKEN", process.env.ACDMTOKEN as string, await _signer(hre));
}

export async function platform(hre: hh) {
    return await hre.ethers.getContractAt("ACDMPlatform", process.env.PLATFORM as string, await _signer(hre));
}

export async function dao(hre: hh) {
    return await hre.ethers.getContractAt("DAO", process.env.DAO as string, await _signer(hre));
}

export async function staking(hre: hh) {
    return await hre.ethers.getContractAt("Staking", process.env.STAKING as string, await _signer(hre));
}

export async function getSalePrice(hre: hh) {
    const _platform = await platform(hre);
    return await _platform.salePrice();
}

// export async function getTradePrice(hre: hh, index: BigNumber) {
//     const _platform = await platform(hre);
//     return (await _platform.lots(index)).price;
// }

export function i_face(hre: hh) {
    return new hre.ethers.utils.Interface(ABI);
}