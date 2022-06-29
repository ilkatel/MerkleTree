import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { add, del, update } from "./queries/db"

dotenv.config();

async function listener() {
    console.log("Back imitation starting...");

    const contract = await ethers.getContractAt("ACDMPlatform", process.env.PLATFORM as string);
    console.log("ACDMPlatfotm contract connected");
    console.log("Start listening");
    
    await new Promise(async (resolve, reject) => {
        contract.on("AddLot", async (
            amount: string, price: string, index: string
        ) => {
            try {
                console.log(`Catch AddLot with args {amount: ${amount}; price: ${price}; index: ${index}}`);
                await add(index, amount, price);
            } catch(e) { console.log(`AddLot Error as ${e}`); }
        });
        contract.on("EditLot", async (
            amount: string, index: string
        ) => {
            try {
                console.log(`Catch EditLot with args {amount: ${amount}; index: ${index}}`);
                await update(index, amount);
            } catch(e) { console.log(`EditLot Error as ${e}`); }
        });
        contract.on("DelLot", async (
            index: string
        ) => {
            try {
                console.log(`Catch DelLot with args {index: ${index}}`);
                await del(index);
            } catch(e) { console.log(`DelLot Error as ${e}`); }
        });
    });
}

listener();