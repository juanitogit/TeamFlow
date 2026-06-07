const pg = require("pg");
const client = new pg.Client({ connectionString: "postgresql://neondb_owner:npg_eMNR6c4BbLSY@ep-floral-frost-acl2p2ml-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require" });

async function run() {
  await client.connect();
  console.log("Connected");

  await client.query(`DROP TABLE IF EXISTS workspace_tasks`);
  await client.query(`DROP TYPE IF EXISTS ws_task_type CASCADE`);
  await client.query(`DROP TYPE IF EXISTS ws_task_status CASCADE`);
  console.log("Cleaned");

  await client.query(`CREATE TYPE ws_task_type AS ENUM ('programacion', 'documentacion', 'investigacion')`);
  console.log("1/3 ws_task_type enum");

  await client.query(`CREATE TYPE ws_task_status AS ENUM ('pendiente', 'en_progreso', 'completada', 'vencida')`);
  console.log("2/3 ws_task_status enum");

  await client.query(`
    CREATE TABLE workspace_tasks (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      assigned_to INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      type ws_task_type NOT NULL,
      status ws_task_status NOT NULL,
      commit_sha TEXT,
      due_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("3/3 table created");

  await client.end();
  console.log("DONE!");
}
run().catch(e => { console.error(e); process.exit(1); });
