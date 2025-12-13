const { Pool } = require('pg');
require('dotenv').config();

// Verificación de seguridad
if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
    console.error('🔥 [CRITICAL ERROR] Faltan variables de entorno para la Base de Datos.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?sslmode=${process.env.DB_SSL_MODE}`,
    ssl: { rejectUnauthorized: false }, // Necesario para Neon
    keepAlive: true,
});

pool.on('connect', () => {
    console.log('✅ [DB] Conexión establecida con PostgreSQL (Neon.tech)');
});

pool.on('error', (err) => {
    console.error('❌ [DB ERROR] Error inesperado en el cliente de base de datos:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool, // Exportamos pool para transacciones
};