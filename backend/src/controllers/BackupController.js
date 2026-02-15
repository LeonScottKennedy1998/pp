const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const pool = require('../config/database');

const execPromise = util.promisify(exec);

const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupController {

    async getBackups(req, res) {
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(filename => filename.endsWith('.sql'))
                .map(filename => {
                    const filePath = path.join(BACKUP_DIR, filename);
                    const stats = fs.statSync(filePath);

                    return {
                        filename,
                        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                        created: stats.birthtime,
                        type: 'SQL'
                    };
                })
                .sort((a, b) => new Date(b.created) - new Date(a.created));

            res.json({ backups: files });
        } catch (error) {
            console.error('Ошибка получения списка бэкапов:', error);
            res.status(500).json({ error: 'Ошибка получения списка бэкапов' });
        }
    }

    async getBackupStats(req, res) {
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(filename => filename.endsWith('.sql'));

            let totalSize = 0;
            let lastBackup = null;

            files.forEach(filename => {
                const stats = fs.statSync(path.join(BACKUP_DIR, filename));
                totalSize += stats.size;

                if (!lastBackup || stats.birthtime > lastBackup) {
                    lastBackup = stats.birthtime;
                }
            });

            res.json({
                totalBackups: files.length,
                totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
                lastBackup
            });
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ error: 'Ошибка получения статистики' });
        }
    }

    // async createBackup(req, res) {
    //     try {
    //         const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    //         const filename = `backup_${timestamp}.sql`;
    //         const filePath = path.join(BACKUP_DIR, filename);

    //         // Получаем параметры подключения из pool
    //         const client = await pool.connect();
    //         const dbConfig = client.connectionParameters;
    //         client.release();

    //         // Формируем команду pg_dump
    //         const pgDumpCommand = `pg_dump ` +
    //             `-h ${dbConfig.host} ` +
    //             `-p ${dbConfig.port} ` +
    //             `-U ${dbConfig.user} ` +
    //             `-d ${dbConfig.database} ` +
    //             `-F p ` + // plain text format (SQL)
    //             `-b ` + // include large objects
    //             `-c ` + // include DROP commands
    //             `-O ` + // no owner
    //             `-x ` + // no privileges
    //             `--if-exists ` + // use IF EXISTS for DROPs
    //             `> "${filePath}"`;

    //         // Устанавливаем переменную окружения с паролем
    //         await execPromise(pgDumpCommand, {
    //             env: {
    //                 ...process.env,
    //                 PGPASSWORD: dbConfig.password
    //             },
    //             shell: true
    //         });

    //         const stats = fs.statSync(filePath);

    //         res.json({
    //             message: 'Полный SQL бэкап создан',
    //             filename,
    //             size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    //             tables: 'Все таблицы базы данных'
    //         });

    //     } catch (error) {
    //         console.error('Ошибка создания бэкапа:', error);
            
    //         // Удаляем частично созданный файл в случае ошибки
    //         const filePath = path.join(BACKUP_DIR, filename);
    //         if (fs.existsSync(filePath)) {
    //             fs.unlinkSync(filePath);
    //         }
            
    //         res.status(500).json({ 
    //             error: 'Ошибка создания бэкапа',
    //             details: error.message 
    //         });
    //     }
    // }

    async createBackup(req, res) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.sql`;
        
        // Временный файл в /tmp (доступно для записи на Vercel)
        const tmpFilePath = path.join('/tmp', filename);

        // Получаем параметры подключения из pool
        const client = await pool.connect();
        const dbConfig = client.connectionParameters;
        client.release();

        // Формируем команду pg_dump
        const pgDumpCommand = `pg_dump ` +
            `-h ${dbConfig.host} ` +
            `-p ${dbConfig.port} ` +
            `-U ${dbConfig.user} ` +
            `-d ${dbConfig.database} ` +
            `-F p ` + // plain text format (SQL)
            `-b ` + // include large objects
            `-c ` + // include DROP commands
            `-O ` + // no owner
            `-x ` + // no privileges
            `--if-exists ` + // use IF EXISTS for DROPs
            `> "${tmpFilePath}"`;

        // Устанавливаем переменную окружения с паролем
        await execPromise(pgDumpCommand, {
            env: {
                ...process.env,
                PGPASSWORD: dbConfig.password
            },
            shell: true
        });

        // Читаем файл в память
        const backupContent = fs.readFileSync(tmpFilePath, 'utf8');
        
        // Удаляем временный файл
        fs.unlinkSync(tmpFilePath);

        // Отправляем файл сразу как response
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(backupContent);

    } catch (error) {
        console.error('Ошибка создания бэкапа:', error);
        
        res.status(500).json({ 
            error: 'Ошибка создания бэкапа',
            details: error.message 
        });
    }
}

    async restoreBackup(req, res) {
        const { filename } = req.params;
        const { confirm } = req.body;

        if (!confirm) {
            return res.status(400).json({ 
                error: 'Требуется подтверждение для восстановления базы данных' 
            });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл бэкапа не найден' });
        }

        try {
            // Получаем параметры подключения из pool
            const client = await pool.connect();
            const dbConfig = client.connectionParameters;
            client.release();

            // Временно отключаем проверку внешних ключей для быстрого восстановления
            await pool.query('SET session_replication_role = replica;');

            // Формируем команду psql для восстановления
            const psqlCommand = `psql ` +
                `-h ${dbConfig.host} ` +
                `-p ${dbConfig.port} ` +
                `-U ${dbConfig.user} ` +
                `-d ${dbConfig.database} ` +
                `-f "${filePath}"`;

            // Выполняем восстановление
            await execPromise(psqlCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: dbConfig.password
                },
                shell: true
            });

            // Включаем обратно проверку внешних ключей
            await pool.query('SET session_replication_role = origin;');

            res.json({ 
                message: 'База данных успешно восстановлена',
                filename 
            });

        } catch (error) {
            console.error('Ошибка восстановления:', error);
            
            // Включаем обратно проверку внешних ключей в случае ошибки
            try {
                await pool.query('SET session_replication_role = origin;');
            } catch (e) {
                console.error('Ошибка при восстановлении настроек:', e);
            }
            
            res.status(500).json({ 
                error: 'Ошибка восстановления базы данных',
                details: error.message 
            });
        }
    }

    async downloadBackup(req, res) {
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        res.download(filePath);
    }

    async deleteBackup(req, res) {
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        try {
            fs.unlinkSync(filePath);
            res.json({ message: 'Бэкап удалён' });
        } catch (error) {
            console.error('Ошибка удаления:', error);
            res.status(500).json({ error: 'Ошибка удаления бэкапа' });
        }
    }

    // Опционально: автоматическое создание бэкапа по расписанию
    async createScheduledBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `scheduled_backup_${timestamp}.sql`;
            const filePath = path.join(BACKUP_DIR, filename);

            const client = await pool.connect();
            const dbConfig = client.connectionParameters;
            client.release();

            const pgDumpCommand = `pg_dump ` +
                `-h ${dbConfig.host} ` +
                `-p ${dbConfig.port} ` +
                `-U ${dbConfig.user} ` +
                `-d ${dbConfig.database} ` +
                `-F p -b -c -O -x --if-exists > "${filePath}"`;

            await execPromise(pgDumpCommand, {
                env: {
                    ...process.env,
                    PGPASSWORD: dbConfig.password
                },
                shell: true
            });

            console.log(`✅ Автоматический бэкап создан: ${filename}`);
            
            // Оставляем только последние 10 бэкапов
            await this.cleanupOldBackups(10);
            
        } catch (error) {
            console.error('❌ Ошибка автоматического бэкапа:', error);
        }
    }

    async cleanupOldBackups(keepCount = 10) {
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.endsWith('.sql'))
                .map(f => ({
                    name: f,
                    path: path.join(BACKUP_DIR, f),
                    time: fs.statSync(path.join(BACKUP_DIR, f)).birthtime
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length > keepCount) {
                const toDelete = files.slice(keepCount);
                for (const file of toDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`Удален старый бэкап: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('Ошибка очистки старых бэкапов:', error);
        }
    }
}

module.exports = new BackupController();