import { BigNumber, ethers } from "ethers";
import { getClient } from "./client";

const client = getClient();
client.connect();

export async function close() {
    try {
        await client.end();
    } catch(_) {}
}

function big(s: any) {
    return ethers.BigNumber.from(s);
}

export async function reset() {
    await client.query('DROP TABLE IF EXISTS orders');
    await client.query('CREATE TABLE IF NOT EXISTS orders (index varchar PRIMARY KEY NOT NULL, amount varchar NOT NULL, price varchar NOT NULL)');
}

export async function add(index: string, amount: string, price: string) {
    await client.query(`INSERT INTO orders (index, amount, price) VALUES (${index}, ${amount}, ${price})`);
}

export async function update(index: string, amount: string) {
    await client.query('UPDATE orders SET amount = $1 WHERE index = $2', [amount, index]);
}

export async function del(index: string) {
    await client.query('DELETE * FROM orders WHERE index = $1', [index]);
}

export async function find(amount: BigNumber, price: BigNumber) {
    let _amount = amount;
    let result = await client.query(`SELECT * FROM orders WHERE price::numeric <= ${price.toString()} ORDER BY price::numeric ASC`);
    if (result.rows.length == 0) throw Error("There are no products in this price category");
    let output: any[] = [];
    for (let res of result.rows) {
        if (big(res[1]).gte(_amount)) {
            output.push([big(res[0]), big(_amount), big(res[2])]);
            _amount = big(0);
            break;
        } else {
            output.push([big(res[0]), big(res[1]), big(res[2])]);
            console.log(_amount.sub(big(res[1])));
            _amount = _amount.sub(big(res[1]));
        }
    }
    if (!_amount.eq(0)) throw Error(`There are no required number of products in this price category. In stock: ${amount.sub(_amount)}`);
    return output;
}