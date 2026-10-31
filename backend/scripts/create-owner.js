import 'dotenv/config';
import pg from 'pg';
import argon2 from 'argon2';

const { Pool } = pg;
const required = ['DATABASE_URL', 'OWNER_NAME', 'OWNER_EMAIL', 'OWNER_PASSWORD', 'ORGANIZATION_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.OWNER_PASSWORD.length < 12) {
  console.error('OWNER_PASSWORD must contain at least 12 characters.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const existing = await client.query(
    'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [process.env.OWNER_EMAIL],
  );
  if (existing.rowCount) throw new Error('An account with this email already exists.');

  const organization = await client.query(
    'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
    [process.env.ORGANIZATION_NAME],
  );
  const user = await client.query(
    `INSERT INTO users (organization_id, full_name, email, password_hash)
     VALUES ($1, $2, lower($3), $4) RETURNING id, organization_id`,
    [
      organization.rows[0].id,
      process.env.OWNER_NAME,
      process.env.OWNER_EMAIL,
      await argon2.hash(process.env.OWNER_PASSWORD, { type: argon2.argon2id }),
    ],
  );
  const role = await client.query("SELECT id FROM roles WHERE code = 'owner'");
  if (!role.rowCount) throw new Error('Owner role is missing. Apply database/schema.sql first.');
  await client.query(
    'INSERT INTO organization_memberships (user_id, organization_id, role_id) VALUES ($1, $2, $3)',
    [user.rows[0].id, user.rows[0].organization_id, role.rows[0].id],
  );
  await client.query('COMMIT');
  console.log('Owner account created successfully.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
