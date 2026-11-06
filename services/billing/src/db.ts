// Database connection, query helpers and a tiny query builder.
import pg from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('connect', () => {
  if (config.isDev) console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const start = Date.now();
  return pool
    .query<T>(text, params)
    .then((result) => {
      if (config.isDev) {
        console.log('Query executed', { text, duration: Date.now() - start, rows: result.rowCount });
      }
      return result;
    })
    .catch((error: Error) => {
      console.error('Query error:', { text, error: error.message });
      throw error;
    });
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function whereClause(where: Record<string, unknown>, startAt = 1): { sql: string; values: unknown[] } {
  const keys = Object.keys(where);
  const values = Object.values(where);
  const sql = keys.map((key, i) => `${key} = $${startAt + i}`).join(' AND ');
  return { sql: sql ? ` WHERE ${sql}` : '', values };
}

async function count(table: string, where: Record<string, unknown> = {}): Promise<number> {
  const { sql, values } = whereClause(where);
  const result = await query<{ count: string }>(`SELECT COUNT(*) AS count FROM ${table}${sql}`, values);
  return Number.parseInt(result.rows[0].count, 10);
}

/**
 * Small query builder for the hand-written queries in this service. Table and
 * column names are code-controlled; all values are parameterised.
 */
export const db = {
  async findOne(
    table: string,
    where: Record<string, unknown> = {},
    columns = '*',
  ): Promise<any> {
    const { sql, values } = whereClause(where);
    const result = await query(`SELECT ${columns} FROM ${table}${sql} LIMIT 1`, values);
    return result.rows[0] ?? null;
  },

  async findMany(
    table: string,
    where: Record<string, unknown> = {},
    columns = '*',
    orderBy = 'created_at DESC',
    limit: number | null = null,
  ): Promise<any[]> {
    const { sql, values } = whereClause(where);
    let text = `SELECT ${columns} FROM ${table}${sql} ORDER BY ${orderBy}`;
    if (limit !== null) text += ` LIMIT ${limit}`;
    const result = await query(text, values);
    return result.rows;
  },

  async insertOne(table: string, data: Record<string, unknown>): Promise<any> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const text = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await query(text, values);
    return result.rows[0];
  },

  async updateOne(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<any> {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereParsed = whereClause(where, dataKeys.length + 1);
    const text = `UPDATE ${table} SET ${setClause}${whereParsed.sql} RETURNING *`;
    const result = await query(text, [...dataValues, ...whereParsed.values]);
    return result.rows[0] ?? null;
  },

  async deleteOne(table: string, where: Record<string, unknown>): Promise<any> {
    const { sql, values } = whereClause(where);
    const result = await query(`DELETE FROM ${table}${sql} RETURNING *`, values);
    return result.rows[0] ?? null;
  },

  count,

  async exists(table: string, where: Record<string, unknown>): Promise<boolean> {
    return (await count(table, where)) > 0;
  },
};

export default db;
