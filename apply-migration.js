import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    user: process.env.DB_USER || 'gen_user',
    host: process.env.DB_HOST || '89.169.46.157',
    database: process.env.DB_NAME || 'default_db',
    password: process.env.DB_PASSWORD || '9H@DDCb.gQm.S}',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    const migrationFile = path.join(__dirname, 'migrations', '001_add_performance_indexes.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('🚀 Applying performance indexes migration...\n');

    try {
        const client = await pool.connect();
        try {
            await client.query(sql);
            console.log('✅ Migration applied successfully!\n');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
