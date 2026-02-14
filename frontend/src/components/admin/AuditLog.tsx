import React, { useState, useEffect } from 'react';
import './Admin.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface AuditLog {
    id: number;
    action: string;
    table_name: string;
    table_id: number;
    old_data: any;
    new_data: any;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
    user_name: string;
    user_email: string;
}

interface AuditStats {
    actions: Array<{
        action: string;
        count: string;
        first_occurrence: string;
        last_occurrence: string;
    }>;
    tables: Array<{
        table_name: string;
        count: string;
    }>;
    top_users: Array<{
        user_name: string;
        action_count: string;
    }>;
    total_logs: number;
}

const AuditLog = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [actions, setActions] = useState<string[]>([]);
    const [tables, setTables] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [filters, setFilters] = useState({
        action: '',
        table_name: '',
        start_date: '',
        end_date: '',
        limit: 50,
        offset: 0
    });
    
    const [totalLogs, setTotalLogs] = useState(0);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchAuditLog = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const params = new URLSearchParams();
            if (filters.action) params.append('action', filters.action);
            if (filters.table_name) params.append('table_name', filters.table_name);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            params.append('limit', filters.limit.toString());
            params.append('offset', filters.offset.toString());
            
            const response = await fetch(`${API_URLS.AUDIT.BASE}?${params}`, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки журнала аудита');
            
            const data = await response.json();
            setLogs(data.logs);
            setTotalLogs(data.pagination.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditStats = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.AUDIT.STATS, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    };

    const fetchActions = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.AUDIT.ACTIONS, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            setActions(data);
        } catch (error) {
            console.error('Ошибка загрузки действий:', error);
        }
    };

    const fetchTables = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.AUDIT.TABLES, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            setTables(data);
        } catch (error) {
            console.error('Ошибка загрузки таблиц:', error);
        }
    };

    useEffect(() => {
        fetchAuditLog();
        fetchAuditStats();
        fetchActions();
        fetchTables();
    }, [filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value,
            offset: 0
        });
    };

    const handlePageChange = (newOffset: number) => {
        setFilters({
            ...filters,
            offset: newOffset
        });
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            table_name: '',
            start_date: '',
            end_date: '',
            limit: 50,
            offset: 0
        });
    };

    const formatJSON = (data: any) => {
        if (!data) return '—';
        return JSON.stringify(data, null, 2);
    };

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return '#2ecc71';
        if (action.includes('UPDATE')) return '#3498db';
        if (action.includes('DELETE')) return '#e74c3c';
        if (action.includes('LOGIN')) return '#9b59b6';
        if (action.includes('BLOCK')) return '#e67e22';
        return '#7f8c8d';
    };

    if (loading) return <div className="loading">Загрузка журнала аудита...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const totalPages = Math.ceil(totalLogs / filters.limit);
    const currentPage = Math.floor(filters.offset / filters.limit) + 1;

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>Журнал аудита</h1>
                <button 
                    onClick={clearFilters}
                    className="secondary-btn"
                >
                    Сбросить фильтры
                </button>
            </div>

            {/* Статистика */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Всего записей</h3>
                        <div className="stat-number">{stats.total_logs}</div>
                    </div>
                    
                    <div className="stat-card">
                        <h3>Топ действий</h3>
                        <div className="stat-list">
                            {stats.actions.slice(0, 3).map(item => (
                                <div key={item.action} className="stat-item">
                                    <span>{item.action}</span>
                                    <span className="stat-count">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <h3>Топ пользователей</h3>
                        <div className="stat-list">
                            {stats.top_users.slice(0, 3).map(item => (
                                <div key={item.user_name} className="stat-item">
                                    <span>{item.user_name}</span>
                                    <span className="stat-count">{item.action_count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                </div>
            )}

            <div className="filters-panel">
                <div className="filter-group">
                    <label>Действие:</label>
                    <select
                        name="action"
                        value={filters.action}
                        onChange={handleFilterChange}
                    >
                        <option value="">Все действия</option>
                        {actions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>Таблица:</label>
                    <select
                        name="table_name"
                        value={filters.table_name}
                        onChange={handleFilterChange}
                    >
                        <option value="">Все таблицы</option>
                        {tables.map(table => (
                            <option key={table} value={table}>{table}</option>
                        ))}
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>С даты:</label>
                    <input
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                    />
                </div>
                
                <div className="filter-group">
                    <label>По дату:</label>
                    <input
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                    />
                </div>
                
                <div className="filter-group">
                    <label>На странице:</label>
                    <select
                        name="limit"
                        value={filters.limit}
                        onChange={handleFilterChange}
                    >
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            <div className="pagination">
                <button 
                    onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                    disabled={filters.offset === 0}
                    className="page-btn"
                >
                    ← Назад
                </button>
                
                <span className="page-info">
                    Страница {currentPage} из {totalPages} ({totalLogs} записей)
                </span>
                
                <button 
                    onClick={() => handlePageChange(filters.offset + filters.limit)}
                    disabled={filters.offset + filters.limit >= totalLogs}
                    className="page-btn"
                >
                    Вперед →
                </button>
            </div>

            <div className="audit-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Дата и время</th>
                            <th>Пользователь</th>
                            <th>Действие</th>
                            <th>Таблица</th>
                            <th>ID записи</th>
                            <th>Детали</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td>#{log.id}</td>
                                <td>
                                    {new Date(log.created_at).toLocaleString('ru-RU')}
                                </td>
                                <td>
                                    <div className="user-info">
                                        <strong>{log.user_name}</strong>
                                        <small>{log.user_email}</small>
                                    </div>
                                </td>
                                <td>
                                    <span 
                                        className="action-badge"
                                        style={{ backgroundColor: getActionColor(log.action) }}
                                    >
                                        {log.action}
                                    </span>
                                </td>
                                <td>{log.table_name}</td>
                                <td>{log.table_id || '—'}</td>
                                <td>
                                    <button 
                                        onClick={() => setSelectedLog(log)}
                                        className="details-btn"
                                    >
                                        Показать
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {logs.length === 0 && (
                <div className="empty-state">
                    <p>Записи не найдены</p>
                </div>
            )}

            {selectedLog && (
                <div className="modal-overlay">
                    <div className="modal large-modal">
                        <h2>Детали записи аудита #{selectedLog.id}</h2>
                        
                        <div className="audit-details">
                            <div className="detail-section">
                                <h4>Основная информация</h4>
                                <div className="detail-row">
                                    <span>Действие:</span>
                                    <span className="action-badge" style={{ backgroundColor: getActionColor(selectedLog.action) }}>
                                        {selectedLog.action}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span>Таблица:</span>
                                    <span>{selectedLog.table_name}</span>
                                </div>
                                <div className="detail-row">
                                    <span>ID записи:</span>
                                    <span>{selectedLog.table_id || '—'}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Дата и время:</span>
                                    <span>{new Date(selectedLog.created_at).toLocaleString('ru-RU')}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Пользователь:</span>
                                    <span>{selectedLog.user_name} ({selectedLog.user_email})</span>
                                </div>
                            </div>
                            
                            <div className="detail-section">
                                <h4>Данные до изменения</h4>
                                <pre className="json-view">
                                    {formatJSON(selectedLog.old_data)}
                                </pre>
                            </div>
                            
                            <div className="detail-section">
                                <h4>Данные после изменения</h4>
                                <pre className="json-view">
                                    {formatJSON(selectedLog.new_data)}
                                </pre>
                            </div>
                            
                            {selectedLog.ip_address && (
                                <div className="detail-section">
                                    <h4>Техническая информация</h4>
                                    <div className="detail-row">
                                        <span>IP адрес:</span>
                                        <span>{selectedLog.ip_address}</span>
                                    </div>
                                    {selectedLog.user_agent && (
                                        <div className="detail-row">
                                            <span>User Agent:</span>
                                            <span className="user-agent">{selectedLog.user_agent}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                type="button"
                                className="secondary-btn"
                                onClick={() => setSelectedLog(null)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLog;