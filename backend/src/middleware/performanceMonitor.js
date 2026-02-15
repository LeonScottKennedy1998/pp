// middleware/performanceMonitor.js
const pool = require('../config/database');

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
    }

    // Начать измерение
    startMeasurement(reqId, endpoint) {
        this.startTimes.set(reqId, {
            start: process.hrtime(),
            endpoint: endpoint
        });
    }

    // Завершить измерение и сохранить
    async endMeasurement(reqId, userId = null) {
        if (!this.startTimes.has(reqId)) return;

        const measurement = this.startTimes.get(reqId);
        const end = process.hrtime(measurement.start);
        const durationMs = (end[0] * 1000) + (end[1] / 1000000); // в миллисекундах

        try {
            await pool.query(
                `INSERT INTO performance_metrics 
                 (metric_type, metric_value, endpoint, user_id, additional_data)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['response_time', durationMs, measurement.endpoint, userId, 
                 JSON.stringify({
                     memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
                     timestamp: new Date().toISOString()
                 })]
            );
        } catch (error) {
            console.error('Ошибка сохранения метрики:', error);
        }

        this.startTimes.delete(reqId);
        return durationMs;
    }

    // Сохранить метрику использования памяти
    async saveMemoryUsage() {
        try {
            const memory = process.memoryUsage();
            await pool.query(
                `INSERT INTO performance_metrics 
                 (metric_type, metric_value, additional_data)
                 VALUES ($1, $2, $3)`,
                ['memory_usage', memory.heapUsed / 1024 / 1024, // MB
                 JSON.stringify({
                     rss: memory.rss / 1024 / 1024,
                     heapTotal: memory.heapTotal / 1024 / 1024,
                     external: memory.external / 1024 / 1024,
                     timestamp: new Date().toISOString()
                 })]
            );
        } catch (error) {
            console.error('Ошибка сохранения использования памяти:', error);
        }
    }

    // Сохранить метрику времени отправки email
    async saveEmailSendTime(email, durationMs, success = true) {
        try {
            await pool.query(
                `INSERT INTO performance_metrics 
                 (metric_type, metric_value, additional_data)
                 VALUES ($1, $2, $3)`,
                ['email_send_time', durationMs,
                 JSON.stringify({
                     email: email,
                     success: success,
                     timestamp: new Date().toISOString()
                 })]
            );
        } catch (error) {
            console.error('Ошибка сохранения метрики email:', error);
        }
    }

    // Сохранить количество запросов
    async saveRequestCount(endpoint) {
        try {
            await pool.query(
                `INSERT INTO performance_metrics 
                 (metric_type, metric_value, endpoint)
                 VALUES ($1, $2, $3)`,
                ['request_count', 1, endpoint]
            );
        } catch (error) {
            console.error('Ошибка сохранения количества запросов:', error);
        }
    }

    // Получить статистику за период
    async getStats(startDate, endDate) {
        try {
            const result = await pool.query(`
                SELECT 
                    metric_type,
                    COUNT(*) as total_count,
                    ROUND(AVG(metric_value)::numeric, 2) as avg_value,
                    ROUND(MIN(metric_value)::numeric, 2) as min_value,
                    ROUND(MAX(metric_value)::numeric, 2) as max_value,
                    ROUND(STDDEV(metric_value)::numeric, 2) as std_dev,
                    COUNT(DISTINCT endpoint) as unique_endpoints
                FROM performance_metrics
                WHERE created_at BETWEEN $1 AND $2
                GROUP BY metric_type
                ORDER BY metric_type
            `, [startDate, endDate]);

            return result.rows;
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return [];
        }
    }

    // Получить данные для графика
    async getChartData(metricType, hours = 24) {
        try {
            const result = await pool.query(`
                SELECT 
                    DATE_TRUNC('hour', created_at) as hour,
                    ROUND(AVG(metric_value)::numeric, 2) as avg_value,
                    COUNT(*) as request_count
                FROM performance_metrics
                WHERE metric_type = $1 
                  AND created_at > NOW() - INTERVAL '${hours} hours'
                GROUP BY DATE_TRUNC('hour', created_at)
                ORDER BY hour
            `, [metricType]);

            return result.rows;
        } catch (error) {
            console.error('Ошибка получения данных графика:', error);
            return [];
        }
    }

    // Получить топ медленных запросов
    async getSlowRequests(limit = 10, hours = 1) {
        try {
            const result = await pool.query(`
                SELECT 
                    endpoint,
                    ROUND(metric_value::numeric, 2) as response_time_ms,
                    created_at,
                    additional_data->>'timestamp' as exact_time
                FROM performance_metrics
                WHERE metric_type = 'response_time'
                AND created_at > NOW() - INTERVAL '${hours} hours'
                ORDER BY metric_value DESC
                LIMIT $1
            `, [limit]);

            return result.rows;
        } catch (error) {
            console.error('Ошибка получения медленных запросов:', error);
            return [];
        }
    }

    // Получить статистику по эмейлам
    async getEmailStats(hours = 24) {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_emails,
                    SUM(CASE WHEN additional_data->>'success' = 'true' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN additional_data->>'success' = 'false' THEN 1 ELSE 0 END) as failed,
                    ROUND(AVG(metric_value)::numeric, 2) as avg_send_time_ms,
                    ROUND(MIN(metric_value)::numeric, 2) as min_send_time_ms,
                    ROUND(MAX(metric_value)::numeric, 2) as max_send_time_ms
                FROM performance_metrics
                WHERE metric_type = 'email_send_time'
                  AND created_at > NOW() - INTERVAL '${hours} hours'
            `);

            return result.rows[0] || {};
        } catch (error) {
            console.error('Ошибка получения статистики email:', error);
            return {};
        }
    }
}

// Создаём middleware для Express
const performanceMiddleware = (req, res, next) => {
    const monitor = new PerformanceMonitor();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Начинаем измерение
    monitor.startMeasurement(requestId, req.path);
    
    // Сохраняем количество запросов
    //monitor.saveRequestCount(req.path).catch(console.error);
    
    // Перехватываем отправку ответа
    const originalSend = res.send;
    res.send = function(data) {
        // Завершаем измерение при отправке ответа
        const userId = req.user ? req.user.userId : null;
        monitor.endMeasurement(requestId, userId).then(duration => {
            if (duration) {
                console.log(`⏱️  Запрос ${req.path} выполнен за ${duration.toFixed(2)} мс`);
            }
        }).catch(console.error);
        
        return originalSend.call(this, data);
    };
    
    next();
};

module.exports = { PerformanceMonitor, performanceMiddleware };