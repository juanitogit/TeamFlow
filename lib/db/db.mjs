import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  try {
    await client.query(`
      DO $$ BEGIN
          CREATE TYPE log_type AS ENUM ('reunion', 'documentacion', 'revision', 'soporte', 'otro');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
          CREATE TYPE suggestion_type AS ENUM ('pr_merged', 'task_overdue', 'member_inactive');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
          CREATE TYPE suggestion_status AS ENUM ('pending', 'accepted', 'dismissed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      
      CREATE TABLE IF NOT EXISTS manual_logs (
        id SERIAL PRIMARY KEY, 
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, 
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TIMESTAMPTZ NOT NULL, 
        description TEXT NOT NULL, 
        hours NUMERIC(5,2) NOT NULL, 
        type log_type NOT NULL DEFAULT 'otro', 
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY, 
        workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, 
        type suggestion_type NOT NULL, 
        title TEXT NOT NULL, 
        description TEXT NOT NULL, 
        data JSONB, 
        status suggestion_status NOT NULL DEFAULT 'pending', 
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Success phase 3");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
