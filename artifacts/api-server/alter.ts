import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS image_url text;`);
  console.log("DB Altered!");
  process.exit(0);
}
run();
