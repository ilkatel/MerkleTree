import { getClient } from "./client";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers/lib/utils";

let root: Buffer;
let merkletree: MerkleTree;

const client = getClient();
client.connect();

export async function reset() {
    await client.query('DROP TABLE IF EXISTS whitelists');
    await client.query('CREATE TABLE IF NOT EXISTS whitelists (address VARCHAR PRIMARY KEY NOT NULL)');
}                                                                    

export async function calcRoot() {
    try {
        let leafNodes: string[] = [];
        let addresses = await client.query('SELECT address FROM whitelists');

        for (let address of addresses)
            leafNodes.push(keccak256(address.data[0] as string));

        merkletree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        root = merkletree.getRoot();
    } catch (e) { throw Error(`caclRoot error as ${e}`); }
}

export async function loadTree() {
    if (root == undefined) {
        try {
            await calcRoot();
        } catch (e) { console.log(`loadTree error as ${e}`); }
    }
}

export async function add(addresses: string[]) {
    for (let address of addresses) {
        try {
            await client.query('INSERT INTO whitelists (address) VALUES ($1)', [address]);
        } catch (e) { throw Error(`Insert ${address} error as ${e}`); }
    }
    await calcRoot();
}

export async function del(addresses: string[]) {
    for (let address of addresses) {
        try {
            await client.query('DELETE * FROM whitelists WHERE address = $1', [address]);
        } catch (e) { throw Error(`Delete ${address} error as ${e}`); }
    }
    await calcRoot();
}

export async function getProof(address: string) {
    await loadTree();
    try {
        return merkletree.getHexProof(keccak256(address));
    } catch (e) { throw Error(`getProof error as ${e}`); }
}

export async function getRoot() {
    await loadTree();
    return root;
}