// Shared PostgreSQL connection pool used throughout the application.
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: process.env.VERCEL === '1' ? 1 : 10, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error.message));
module.exports = pool;
