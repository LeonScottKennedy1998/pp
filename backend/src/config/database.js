const { Pool } = require('pg');

const pool = new Pool({
    // Если есть DB_URL - используем его
    connectionString: process.env.DB_URL,
    
    // Если нет DB_URL, используем отдельные параметры
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    
    // Общие настройки
    ssl: {
        rejectUnauthorized: false
    },
    
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
        console.error('🔍 Проверьте переменные окружения:', {
            hasDB_URL: !!process.env.DB_URL,
            hasDB_USER: !!process.env.DB_USER,
            NODE_ENV: process.env.NODE_ENV
        });
    } else {
        console.log('✅ Успешное подключение к PostgreSQL');
        release();
    }
});

module.exports = pool;