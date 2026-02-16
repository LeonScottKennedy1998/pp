const pool = require('../config/database');
const { PerformanceMonitor } = require('../middleware/performanceMonitor');

class PerformanceController {
    async getDashboardStats(req, res) {
        try {
            const monitor = new PerformanceMonitor();
            
            const endDate = new Date();
            const startDate = new Date(endDate - 24 * 60 * 60 * 1000);
            
            const stats = await monitor.getStats(startDate, endDate);
            
            const responseTimeData = await monitor.getChartData('response_time', 24);
            const memoryUsageData = await monitor.getChartData('memory_usage', 24);
            const requestCountData = await monitor.getChartData('request_count', 24);
            
            const slowRequests = await monitor.getSlowRequests(10);
            
            const emailStats = await monitor.getEmailStats(24);
            
            const systemInfo = {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };
            
            const activeUsersResult = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as active_users
                FROM performance_metrics
                WHERE metric_type = 'response_time'
                  AND created_at > NOW() - INTERVAL '1 hour'
                  AND user_id IS NOT NULL
            `);
            
            const popularEndpoints = await pool.query(`
                SELECT 
                    endpoint,
                    COUNT(*) as request_count,
                    ROUND(AVG(metric_value)::numeric, 2) as avg_response_time
                FROM performance_metrics
                WHERE metric_type = 'response_time'
                AND created_at > NOW() - INTERVAL '1 hour'
                GROUP BY endpoint
                ORDER BY request_count DESC
                LIMIT 10
            `);
            
            res.json({
                system: systemInfo,
                stats: stats,
                charts: {
                    responseTime: responseTimeData,
                    memoryUsage: memoryUsageData,
                    requestCount: requestCountData
                },
                slowRequests: slowRequests,
                emailStats: emailStats,
                activeUsers: activeUsersResult.rows[0]?.active_users || 0,
                popularEndpoints: popularEndpoints.rows
            });
            
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ error: 'Ошибка получения статистики производительности' });
        }
    }
    
    async getRealTimeMetrics(req, res) {
        try {
            const monitor = new PerformanceMonitor();
            
            const endDate = new Date();
            const startDate = new Date(endDate - 5 * 60 * 1000);
            
            const stats = await monitor.getStats(startDate, endDate);
            
            const memory = process.memoryUsage();
            
            const dbConnections = await pool.query(`
                SELECT count(*) as connections 
                FROM pg_stat_activity 
                WHERE datname = current_database()
            `);
            
            res.json({
                timestamp: new Date().toISOString(),
                memory: {
                    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
                    rss: Math.round(memory.rss / 1024 / 1024)
                },
                stats: stats,
                database: {
                    connections: dbConnections.rows[0]?.connections || 0
                },
                load: {
                    avgResponseTime: stats.find(s => s.metric_type === 'response_time')?.avg_value || 0,
                    requestsPerMinute: stats.find(s => s.metric_type === 'request_count')?.total_count / 5 || 0
                }
            });
            
        } catch (error) {
            console.error('Ошибка получения метрик в реальном времени:', error);
            res.status(500).json({ error: 'Ошибка получения метрик' });
        }
    }
    
    async clearOldMetrics(req, res) {
        try {
            const result = await pool.query(`
                DELETE FROM performance_metrics 
                WHERE created_at < NOW() - INTERVAL '30 days'
            `);
            
            res.json({
                message: `Удалено ${result.rowCount} старых записей метрик`,
                deletedCount: result.rowCount
            });
            
        } catch (error) {
            console.error('Ошибка очистки метрик:', error);
            res.status(500).json({ error: 'Ошибка очистки метрик' });
        }
    }
}

module.exports = new PerformanceController();