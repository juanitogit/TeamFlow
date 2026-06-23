const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_eMNR6c4BbLSY@ep-floral-frost-acl2p2ml-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(async () => {
  try {
    await client.query('ALTER TABLE "workspace_tasks" ADD COLUMN IF NOT EXISTS "warning_email_sent_at" timestamp with time zone;');
    await client.query('ALTER TABLE "workspace_tasks" ADD COLUMN IF NOT EXISTS "penalty_applied_at" timestamp with time zone;');
    
    // Also, if workspaces inviteCode has a unique constraint that fails, we can add a random invite code to existing workspaces
    const res = await client.query('SELECT id, invite_code FROM workspaces WHERE invite_code IS NULL OR invite_code = \'\'');
    for (const row of res.rows) {
        const rand = Math.random().toString(36).substring(2, 8);
        await client.query('UPDATE workspaces SET invite_code = $1 WHERE id = $2', [rand, row.id]);
    }
    
    console.log('Columns added successfully');
  } catch (err) {
    console.error(err);
  } finally {
    client.end();
  }
});
