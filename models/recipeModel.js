// Plain SQL functions for reading and changing recipes.
const db = require('../db/pool');
exports.list = async (filters = {}) => {
  const values = []; const where = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  let rank = '0';
  if (filters.search) { const terms=[...new Set(String(filters.search).split(/[\n,]+/).map(x=>x.trim().toLowerCase()).filter(x=>x.length>1))].slice(0,20); values.push(terms); const n=values.length; where.push(`(r.title ILIKE '%' || array_to_string($${n}::text[], ' ') || '%' OR r.ingredients ILIKE '%' || array_to_string($${n}::text[], ' ') || '%' OR EXISTS (SELECT 1 FROM unnest($${n}::text[]) t WHERE r.title ILIKE '%'||t||'%' OR r.ingredients ILIKE '%'||t||'%' OR array_to_string(r.tags, ',') ILIKE '%'||t||'%'))`); rank=`(SELECT count(*) FROM unnest($${n}::text[]) term WHERE r.ingredients ILIKE '%'||term||'%')`; }
  if (filters.cuisine) add('r.cuisine = ?', filters.cuisine);
  let difficultyRank=null;
  if (['Easy','Medium','Hard'].includes(filters.difficulty)) { const levels=['Easy','Medium','Hard'],i=levels.indexOf(filters.difficulty),allowed=levels.filter((_,n)=>Math.abs(n-i)<=1);values.push(allowed);const n=values.length;where.push(`r.difficulty::text=ANY($${n}::text[])`);values.push(filters.difficulty);difficultyRank=`CASE WHEN r.difficulty::text=$${n+1}::text THEN 1 ELSE 0 END`; }
  let timeRank=null;
  const target=Number(filters.maxTime);
  if (Number.isFinite(target)&&target>0) { const tolerance=Math.max(5,Math.ceil(target*.2)); const n=values.length+1;values.push(Math.min(target,1440),tolerance);where.push(`r.cooking_time <= $${n}::integer + $${n+1}::integer`);timeRank=`ABS(r.cooking_time-$${n}::integer)`; }
  values.push(filters.userId||null);const userParam=values.length;
  const ordering=['ingredient_match_count DESC'];if(difficultyRank)ordering.push(`(${difficultyRank}) DESC`);if(timeRank)ordering.push(`(${timeRank}) ASC`);ordering.push('r.created_at DESC');
  const sql = `SELECT r.*, u.name AS author_name, ${rank} AS ingredient_match_count, EXISTS (SELECT 1 FROM favorites f WHERE f.user_id=$${userParam} AND f.recipe_id=r.id) AS is_favorite FROM recipes r LEFT JOIN users u ON u.id=r.user_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${ordering.join(', ')}`;
  return (await db.query(sql, values)).rows;
};
exports.findById = async (id) => (await db.query('SELECT r.*, u.name AS author_name FROM recipes r LEFT JOIN users u ON u.id=r.user_id WHERE r.id=$1', [id])).rows[0];
exports.create = async (r) => (await db.query('INSERT INTO recipes(user_id,title,ingredients,steps,cooking_time,difficulty,cuisine,tags,image_path) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [r.user_id,r.title,r.ingredients,r.steps,r.cooking_time,r.difficulty,r.cuisine,r.tags,r.image_path])).rows[0];
exports.update = async (id, userId, r) => (await db.query('UPDATE recipes SET title=$3, ingredients=$4, steps=$5, cooking_time=$6, difficulty=$7, cuisine=$8, tags=$9, image_path=COALESCE($10,image_path) WHERE id=$1 AND user_id=$2 RETURNING *', [id,userId,r.title,r.ingredients,r.steps,r.cooking_time,r.difficulty,r.cuisine,r.tags,r.image_path || null])).rows[0];
exports.remove = async (id, userId) => (await db.query('DELETE FROM recipes WHERE id=$1 AND user_id=$2 RETURNING id', [id,userId])).rowCount > 0;
