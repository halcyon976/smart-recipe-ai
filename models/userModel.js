// Plain SQL functions for user accounts and profile data.
const db = require('../db/pool');
exports.findByEmail = async (email) => (await db.query('SELECT * FROM users WHERE email=$1', [email])).rows[0];
exports.findById = async (id) => (await db.query('SELECT id,name,email,bio,created_at FROM users WHERE id=$1', [id])).rows[0];
exports.create = async (name,email,passwordHash) => (await db.query('INSERT INTO users(name,email,password_hash,email_verified) VALUES($1,$2,$3,FALSE) RETURNING id,name,email,bio,created_at', [name,email,passwordHash])).rows[0];
exports.update = async (id,name,bio) => (await db.query('UPDATE users SET name=$2,bio=$3 WHERE id=$1 RETURNING id,name,email,bio,created_at', [id,name,bio])).rows[0];
