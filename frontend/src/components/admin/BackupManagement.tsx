import React, { useState, useEffect } from 'react';
import './BackupManagement.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface BackupFile {
    filename: string;
    size: string;
    created: string;
    type: 'SQL' | 'JSON';
}

interface BackupStats {
    totalBackups: number;
    totalSize: string;
    lastBackup: string | null;
    sqlCount: number;
    jsonCount: number;
}

const BackupManagement = () => {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [error, setError] = useState('');

    const [backupOptions, setBackupOptions] = useState({
        includeData: true,
        includeSchema: true,
        backupType: 'sql'
    });

    const fetchBackups = async () => {
        const token = localStorage.getItem('token');

        try {
            const [backupsResponse, statsResponse] = await Promise.all([
                fetch(API_URLS.BACKUPS.BASE, {
                    headers: getAuthHeaders()
                }),
                fetch(API_URLS.BACKUPS.STATS, {
                    headers: getAuthHeaders()
                })
            ]);

            if (!backupsResponse.ok) throw new Error('Ошибка загрузки бэкапов');

            const backupsData = await backupsResponse.json();
            const statsData = await statsResponse.json();

            setBackups(backupsData.backups || []);
            setStats(statsData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        setError('');
        
        try {
            const endpoint = backupOptions.backupType === 'sql'
                ? API_URLS.BACKUPS.SQL_BACKUP
                : API_URLS.BACKUPS.JSON_BACKUP;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: backupOptions.backupType === 'sql'
                    ? JSON.stringify({
                        includeData: backupOptions.includeData,
                        includeSchema: backupOptions.includeSchema
                    })
                    : JSON.stringify({})
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка создания бэкапа');
            }

            alert(`✅ ${data.message}\nФайл: ${data.filename}\nРазмер: ${data.size}`);
            fetchBackups();
        } catch (err: any) {
            alert(`❌ ${err.message}`);
        } finally {
            setCreatingBackup(false);
        }
    };

    const handleDownloadBackup = async (filename: string) => {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(
                API_URLS.BACKUPS.DOWNLOAD(filename),
                {
                    headers: getAuthHeaders()
                }
            );

            if (!response.ok) throw new Error('Ошибка скачивания');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            alert(`❌ ${err.message}`);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!window.confirm(`Удалить бэкап "${filename}"?`)) return;

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(
                API_URLS.BACKUPS.DELETE(filename),
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ошибка удаления');

            alert('✅ Бэкап удалён');
            fetchBackups();
        } catch (err: any) {
            alert(`❌ ${err.message}`);
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleString('ru-RU');

    if (loading) return <div className="loading">Загрузка бэкапов...</div>;

    return (
        <div className="backup-management">
            <div className="page-header">
                <h1>Управление резервными копиями</h1>
                <p>Создание и скачивание резервных копий базы данных</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Всего бэкапов</h3>
                        <div className="stat-number">{stats.totalBackups}</div>
                        <div className="stat-detail">
                            SQL: {stats.sqlCount} | JSON: {stats.jsonCount}
                        </div>
                    </div>

                    <div className="stat-card">
                        <h3>Общий размер</h3>
                        <div className="stat-number">{stats.totalSize}</div>
                    </div>

                    <div className="stat-card">
                        <h3>Последний бэкап</h3>
                        <div className="stat-number">
                            {stats.lastBackup ? formatDate(stats.lastBackup) : 'Нет'}
                        </div>
                    </div>
                </div>
            )}

            <div className="backup-card">
                <h2>📁 Создать бэкап</h2>

                <div className="radio-group">
                    <label>
                        <input
                            type="radio"
                            value="sql"
                            checked={backupOptions.backupType === 'sql'}
                            onChange={(e) =>
                                setBackupOptions({
                                    ...backupOptions,
                                    backupType: e.target.value
                                })
                            }
                        />
                        SQL
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="json"
                            checked={backupOptions.backupType === 'json'}
                            onChange={(e) =>
                                setBackupOptions({
                                    ...backupOptions,
                                    backupType: e.target.value
                                })
                            }
                        />
                        JSON
                    </label>
                </div>

                {backupOptions.backupType === 'sql' && (
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={backupOptions.includeSchema}
                                onChange={(e) =>
                                    setBackupOptions({
                                        ...backupOptions,
                                        includeSchema: e.target.checked
                                    })
                                }
                            />
                            Структура
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={backupOptions.includeData}
                                onChange={(e) =>
                                    setBackupOptions({
                                        ...backupOptions,
                                        includeData: e.target.checked
                                    })
                                }
                            />
                            Данные
                        </label>
                    </div>
                )}

                <button
                    onClick={handleCreateBackup}
                    disabled={creatingBackup}
                    className="cta-button"
                >
                    {creatingBackup ? 'Создание...' : 'Создать бэкап'}
                </button>
            </div>

            <div className="backup-card">
                <h2>📦 Бэкапы</h2>

                {backups.map((backup) => (
                    <div key={backup.filename} className="backup-item">
                        <div>
                            <strong>{backup.filename}</strong>
                            <div>
                                {backup.size} • {formatDate(backup.created)}
                            </div>
                        </div>

                        <div className="backup-actions">
    <button
        className="download-btn"
        onClick={() => handleDownloadBackup(backup.filename)}
    >
        Скачать
    </button>

    <button
        className="delete-btn"
        onClick={() => handleDeleteBackup(backup.filename)}
    >
        Удалить
    </button>
</div>

                    </div>
                ))}
            </div>
        </div>
    );
};

export default BackupManagement;
