import * as dotenv from "dotenv";
import { Client } from "ts-postgres";

dotenv.config();

export function getClient() {
    const client = new Client({
        user: `${process.env.DBUSER}`,
        password: `${process.env.DBPASS}`,
        host: `${process.env.DBHOST}`,
        port: 5432
    });
    return client;
}