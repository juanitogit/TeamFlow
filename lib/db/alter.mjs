import pg from "pg";

async function run() {
  const c = new pg.Client({ connectionString: "postgresql://neondb_owner:npg_eMNR6c4BbLSY@ep-floral-frost-acl2p2ml-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require" });
  await c.connect();
  await c.query("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS image_url text;");
  await c.end();
  console.log("DB Altered!");
}
run();
