import React, { useState, useEffect } from 'react';
import { API_URLS, getAuthHeaders } from '../../config/api';
import './BackupManagement.css';

interface BackupFile {
    filename: string;
    size: string;
    created: string;
    type: 'SQL';
}

interface BackupStats {
    totalBackups: number;
    totalSize: string;
    lastBackup: string | null;
}

const BackupManagement = () => {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const headers = getAuthHeaders();
            
            const [backupsRes, statsRes] = await Promise.all([
                fetch(API_URLS.BACKUPS.BASE, { headers }),
                fetch(API_URLS.BACKUPS.STATS, { headers })
            ]);

            if (!backupsRes.ok || !statsRes.ok) {
                throw new Error('Ошибка загрузки данных');
            }

            const backupsData = await backupsRes.json();
            const statsData = await statsRes.json();

            setBackups(backupsData.backups || []);
            setStats(statsData);
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        } finally {
            setLoading(false);
        }
    };

    const createBackup = async () => {
        setCreating(true);
        try {
            const response = await fetch(API_URLS.BACKUPS.BASE, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка создания бэкапа');
            }

            alert(`✅ Бэкап успешно создан!\n\n` +
                  `Файл: ${data.filename}\n` +
                  `Размер: ${data.size}`);

            fetchData();
        } catch (error: any) {
            alert(`❌ Ошибка: ${error.message}`);
        } finally {
            setCreating(false);
        }
    };

    const restoreBackup = async (filename: string) => {
        const confirmMessage = 
            `⚠️ ВНИМАНИЕ! Восстановление из "${filename}"\n\n` +
            `Это действие ПОЛНОСТЬЮ ЗАМЕНИТ все данные в базе данных!\n` +
            `Все текущие данные будут потеряны.\n\n` +
            `Вы уверены, что хотите продолжить?`;

        if (!window.confirm(confirmMessage)) return;

        setRestoring(filename);
        try {
            const response = await fetch(API_URLS.BACKUPS.RESTORE(filename), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ confirm: true })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка восстановления');
            }

            alert(`✅ База данных успешно восстановлена из "${filename}"`);
            fetchData();
        } catch (error: any) {
            alert(`❌ Ошибка восстановления: ${error.message}`);
        } finally {
            setRestoring(null);
        }
    };

    const downloadBackup = async (filename: string) => {
        try {
            const response = await fetch(API_URLS.BACKUPS.DOWNLOAD(filename), {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Ошибка скачивания');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            alert(`❌ Ошибка скачивания: ${error.message}`);
        }
    };

    const deleteBackup = async (filename: string) => {
        if (!window.confirm(`Удалить бэкап "${filename}"?`)) return;

        try {
            const response = await fetch(API_URLS.BACKUPS.DELETE(filename), {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Ошибка удаления');
            }

            alert('✅ Бэкап удалён');
            fetchData();
        } catch (error: any) {
            alert(`❌ Ошибка удаления: ${error.message}`);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatSize = (size: string) => {
        return size;
    };

    if (loading) {
        return (
            <div className="backup-management">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="backup-management">
            <h1>💾 Резервное копирование</h1>

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Всего бэкапов</h3>
                        <div className="stat-number">{stats.totalBackups}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Общий размер</h3>
                        <div className="stat-number">{stats.totalSize}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Последний бэкап</h3>
                        <div className="stat-number">
                            {stats.lastBackup 
                                ? new Date(stats.lastBackup).toLocaleDateString('ru-RU')
                                : '—'}
                        </div>
                    </div>
                </div>
            )}

            <div className="backup-card">
                <h2>📁 Создать полный бэкап базы данных</h2>
                <p className="backup-description">
                    Будет создан полный SQL дамп всей базы данных с использованием pg_dump.
                    Бэкап включает структуру всех таблиц, данные, индексы и ограничения.
                </p>
                
                <button
                    onClick={createBackup}
                    disabled={creating}
                    className="create-button"
                >
                    {creating ? '🔄 Создание...' : '💾 Создать полный бэкап'}
                </button>
            </div>

            <div className="backup-card">
                <h2>📋 Существующие бэкапы</h2>
                
                {backups.length === 0 ? (
                    <p className="empty-message">Нет доступных бэкапов</p>
                ) : (
                    <div className="backup-list">
                        {backups.map(backup => (
                            <div key={backup.filename} className="backup-item">
                                <div className="backup-info">
                                    <div className="backup-name">
                                        <span className="backup-icon">📄</span>
                                        <strong>{backup.filename}</strong>
                                    </div>
                                    <div className="backup-meta">
                                        <span className="backup-size">{backup.size}</span>
                                        <span>📅 {formatDate(backup.created)}</span>
                                    </div>
                                </div>
                                
                                <div className="backup-actions">
                                    <button
                                        onClick={() => downloadBackup(backup.filename)}
                                        className="action-button download"
                                        title="Скачать бэкап"
                                    >
                                        ⬇️
                                    </button>
                                    
                                    <button
                                        onClick={() => restoreBackup(backup.filename)}
                                        disabled={restoring === backup.filename}
                                        className="action-button restore"
                                        title="Восстановить из бэкапа"
                                    >
                                        {restoring === backup.filename ? '⏳' : '↩️'}
                                    </button>
                                    
                                    <button
                                        onClick={() => deleteBackup(backup.filename)}
                                        className="action-button delete"
                                        title="Удалить бэкап"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="info-card">
                <h4>ℹ️ Информация о восстановлении</h4>
                <ul>
                    <li>Восстановление полностью заменяет текущую базу данных</li>
                    <li>Процесс может занять некоторое время</li>
                    <li>Во время восстановления база данных будет недоступна</li>
                    <li>Рекомендуется создать свежий бэкап перед восстановлением</li>
                </ul>
            </div>
        </div>
    );
};

export default BackupManagement;