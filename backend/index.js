require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');
const sqlInjectionCheck = require('./src/middleware/sqlInjectionCheck');
const { setupCronJobs } = require('./src/cron/notificationCron');
const { performanceMiddleware, PerformanceMonitor } = require('./src/middleware/performanceMonitor');


const authRoutes = require('./src/routes/AuthRoutes');
const productRoutes = require('./src/routes/ProductRoutes');
const orderRoutes = require('./src/routes/OrderRoutes');
const analyticsRoutes = require('./src/routes/AnalyticsRoutes');
const userRoutes = require('./src/routes/UserRoutes');
const auditRoutes = require('./src/routes/AuditRoutes');
const backupRoutes = require('./src/routes/BackupRoutes');
const wishlistRoutes = require('./src/routes/WishlistRoutes');
const discountRoutes = require('./src/routes/DiscountRoutes');
const purchaseRoutes = require('./src/routes/PurchaseRoutes');
const performanceRoutes = require('./src/routes/PerformanceRoutes');


const app = express();
const port = process.env.PORT || 5001;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

app.use(sqlInjectionCheck);

app.use(performanceMiddleware);

async function checkDatabase() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Подключение к БД успешно:', result.rows[0].now);
        
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
            `);
            console.log('📊 Таблицы в БД:', tables.rows.map(t => t.table_name));
            
        } catch (error) {
            console.error('❌ Ошибка подключения к БД:', error.message);
        }
    }
    
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/procurement', purchaseRoutes);
app.use('/api/performance', performanceRoutes);



const startPerformanceMonitoring = () => {
    const monitor = new PerformanceMonitor();
    
    // Собираем метрики использования памяти каждые 5 минут
    setInterval(() => {
        monitor.saveMemoryUsage().catch(console.error);
    }, 5 * 60 * 1000);
    
    console.log('✅ Мониторинг производительности запущен');
};


app.listen(port, HOST, () => {
    console.log(`🚀 Сервер запущен на ${HOST}:${port}`);
    
    checkDatabase().then(() => {
        setupCronJobs();
        startPerformanceMonitoring();
    }).catch(error => {
        console.error('❌ Не удалось запустить крон-задачи:', error);
    });
});