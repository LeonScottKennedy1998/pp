// components/admin/PerformanceDashboard.tsx
import React, { useState, useEffect } from 'react';
import './PerformanceDashboard.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

const PerformanceDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [realTimeData, setRealTimeData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
        
        if (autoRefresh) {
            const interval = setInterval(fetchRealTimeMetrics, 10000); // Каждые 10 секунд
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchDashboardStats = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.PERFORMANCE.DASHBOARD_STATS, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRealTimeMetrics = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.PERFORMANCE.REALTIME, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                setRealTimeData(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки метрик:', error);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}ч ${minutes}м`;
    };

    if (loading) {
        return <div className="loading">Загрузка метрик производительности...</div>;
    }

    if (!stats) {
        return <div className="error">Не удалось загрузить метрики</div>;
    }

    return (
        <div className="performance-dashboard">
            <div className="dashboard-header">
                <h1>📊 Панель мониторинга производительности</h1>
                <div className="dashboard-controls">
                    <button onClick={fetchDashboardStats} className="refresh-btn">
                        🔄 Обновить
                    </button>
                    <label className="auto-refresh">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Автообновление (10 сек)
                    </label>
                    <div className="last-update">
                        {realTimeData && `Обновлено: ${new Date(realTimeData.timestamp).toLocaleTimeString()}`}
                    </div>
                </div>
            </div>

            {/* Системная информация */}
            <div className="system-info-section">
                <h2>🖥️ Системная информация</h2>
                <div className="system-grid">
                    <div className="info-card">
                        <h3>Node.js</h3>
                        <p>Версия: {stats.system.nodeVersion}</p>
                        <p>Платформа: {stats.system.platform}</p>
                        <p>Аптайм: {formatTime(stats.system.uptime)}</p>
                    </div>
                    
                    <div className="info-card">
                        <h3>Память</h3>
                        <p>Используется: {formatBytes(stats.system.memory.heapUsed)}</p>
                        <p>Всего: {formatBytes(stats.system.memory.heapTotal)}</p>
                        <p>RSS: {formatBytes(stats.system.memory.rss)}</p>
                    </div>
                    
                    <div className="info-card">
                        <h3>Пользователи</h3>
                        <p>Активных: {stats.activeUsers}</p>
                        <p>CPU пользователя: {Math.round(stats.system.cpuUsage.user / 1000)} мс</p>
                        <p>CPU системы: {Math.round(stats.system.cpuUsage.system / 1000)} мс</p>
                    </div>
                </div>
            </div>

            {/* Метрики в реальном времени */}
            {realTimeData && (
                <div className="realtime-section">
                    <h2>⚡ Метрики в реальном времени</h2>
                    <div className="realtime-grid">
                        <div className="metric-card">
                            <h4>📈 Запросы/минуту</h4>
                            <div className="metric-value">
                                {realTimeData.load.requestsPerMinute.toFixed(1)}
                            </div>
                        </div>
                        
                        <div className="metric-card">
                            <h4>⏱️ Среднее время ответа</h4>
                            <div className="metric-value">
                                {realTimeData.load.avgResponseTime} мс
                            </div>
                        </div>
                        
                        <div className="metric-card">
                            <h4>💾 Память</h4>
                            <div className="metric-value">
                                {realTimeData.memory.heapUsed} MB
                            </div>
                        </div>
                        
                        <div className="metric-card">
                            <h4>🔌 Подключения БД</h4>
                            <div className="metric-value">
                                {realTimeData.database.connections}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Статистика по запросам */}
            <div className="requests-section">
                <h2>📊 Статистика запросов (24ч)</h2>
                <div className="requests-grid">
                    {stats.stats.map((stat: any) => (
                        <div key={stat.metric_type} className="stat-card">
                            <h3>
                                {stat.metric_type === 'response_time' && '⏱️ Время ответа'}
                                {stat.metric_type === 'request_count' && '📨 Количество запросов'}
                                {stat.metric_type === 'memory_usage' && '💾 Использование памяти'}
                                {stat.metric_type === 'email_send_time' && '📧 Время отправки email'}
                            </h3>
                            <div className="stat-details">
                                <p>Всего: {stat.total_count}</p>
                                <p>Среднее: {stat.avg_value}</p>
                                <p>Мин: {stat.min_value}</p>
                                <p>Макс: {stat.max_value}</p>
                                <p>Уникальных endpoints: {stat.unique_endpoints}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Статистика по email */}
            {stats.emailStats && Object.keys(stats.emailStats).length > 0 && (
                <div className="email-stats-section">
                    <h2>📧 Статистика отправки email (24ч)</h2>
                    <div className="email-stats-grid">
                        <div className="email-stat-card">
                            <h4>Всего отправлено</h4>
                            <div className="email-stat-value">
                                {stats.emailStats.total_emails || 0}
                            </div>
                        </div>
                        
                        <div className="email-stat-card">
                            <h4>Успешно</h4>
                            <div className="email-stat-value success">
                                {stats.emailStats.successful || 0}
                            </div>
                        </div>
                        
                        <div className="email-stat-card">
                            <h4>Ошибки</h4>
                            <div className="email-stat-value error">
                                {stats.emailStats.failed || 0}
                            </div>
                        </div>
                        
                        <div className="email-stat-card">
                            <h4>Среднее время отправки</h4>
                            <div className="email-stat-value">
                                {stats.emailStats.avg_send_time_ms || 0} мс
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Медленные запросы */}
            {stats.slowRequests && stats.slowRequests.length > 0 && (
                <div className="slow-requests-section">
                    <h2>🐌 Самые медленные запросы</h2>
                    <table className="slow-requests-table">
                        <thead>
                            <tr>
                                <th>Endpoint</th>
                                <th>Время (мс)</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.slowRequests.map((request: any, index: number) => (
                                <tr key={index}>
                                    <td>{request.endpoint || 'Неизвестно'}</td>
                                    <td className="response-time">{request.response_time_ms} мс</td>
                                    <td>{new Date(request.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Популярные endpoints */}
            {stats.popularEndpoints && stats.popularEndpoints.length > 0 && (
                <div className="popular-endpoints-section">
                    <h2>🔥 Популярные endpoints</h2>
                    <table className="endpoints-table">
                        <thead>
                            <tr>
                                <th>Endpoint</th>
                                <th>Количество запросов</th>
                                <th>Среднее время (мс)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.popularEndpoints.map((endpoint: any, index: number) => (
                                <tr key={index}>
                                    <td>{endpoint.endpoint}</td>
                                    <td>{endpoint.request_count}</td>
                                    <td>{endpoint.avg_response_time || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PerformanceDashboard;