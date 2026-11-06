// Apply schema.sql to the configured database.
// Usage: npm run db:migrate
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from '../src/db.js';

const here = dirname(fileURLToPath(import.meta.url));
// dist/scripts -> services/billing
const schemaPath = join(here, '..', '..', 'schema.sql');

const sql = await readFile(schemaPath, 'utf8');
await pool.query(sql);
console.log(`Applied ${schemaPath}`);
await pool.end();
