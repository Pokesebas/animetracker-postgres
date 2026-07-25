// db.js - Conexión (pool) a PostgreSQL, optimizado para funciones serverless de Vercel
const { Pool } = require('pg');

// En serverless, cada "invocación fría" podría crear un pool nuevo si no lo cacheamos.
// Guardamos el pool en una variable global para reutilizarlo entre invocaciones "calientes".
let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL, // Vercel/Neon te da esta variable automáticamente
            ssl: { rejectUnauthorized: false } // necesario para conectarse a Neon/Vercel Postgres
        });
    }
    return pool;
}

module.exports = { getPool };
