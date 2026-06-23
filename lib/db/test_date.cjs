require('dotenv').config({ path: '../../artifacts/api-server/.env' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function test() {
  const result = await sql`SELECT start_time FROM meetings LIMIT 1`;
  if (result.length === 0) { console.log('No meetings'); return; }
  const startTime = result[0].start_time;
  console.log('Type from neon:', typeof startTime);
  console.log('Value from neon:', startTime);
  
  const d = new Date(startTime);
  console.log('Parsed date:', d);
  try {
    console.log(d.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota' }));
  } catch (e) {
    console.error('Error in toLocaleString:', e);
  }
}
test();
