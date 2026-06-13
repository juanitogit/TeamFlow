import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS image_url text;
    `);
    console.log("Success adding image_url");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
