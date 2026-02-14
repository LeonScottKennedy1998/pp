const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

class BackupController {

    async getBackups(req, res) {
        try {
            const files = fs.readdirSync(BACKUP_DIR);

            const backups = files.map(filename => {
                const filePath = path.join(BACKUP_DIR, filename);
                const stats = fs.statSync(filePath);

                return {
                    filename,
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    created: stats.birthtime,
                    type: filename.endsWith('.sql') ? 'SQL' : 'JSON'
                };
            });

            res.json({ backups });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Ошибка получения списка бэкапов' });
        }
    }

    async getBackupStats(req, res) {
        try {
            const files = fs.readdirSync(BACKUP_DIR);

            let totalSize = 0;
            let lastBackup = null;
            let sqlCount = 0;
            let jsonCount = 0;

            files.forEach(filename => {
                const stats = fs.statSync(path.join(BACKUP_DIR, filename));
                totalSize += stats.size;

                if (!lastBackup || stats.birthtime > lastBackup) {
                    lastBackup = stats.birthtime;
                }

                if (filename.endsWith('.sql')) sqlCount++;
                if (filename.endsWith('.json')) jsonCount++;
            });

            res.json({
                totalBackups: files.length,
                totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
                lastBackup,
                sqlCount,
                jsonCount
            });
        } catch (error) {
            res.status(500).json({ error: 'Ошибка получения статистики' });
        }
    }

    async createSqlBackup(req, res) {
        try {
            const { includeSchema = true, includeData = true } = req.body;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${timestamp}.sql`;
            const filePath = path.join(BACKUP_DIR, filename);

            let sqlDump = '';

            if (includeSchema) {
                const tables = await pool.query(`
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                `);

                for (const row of tables.rows) {
                    const table = row.table_name;
                    const createTable = await pool.query(`
                        SELECT 'CREATE TABLE ' || table_name || E'\n(\n' ||
                        string_agg(column_name || ' ' || data_type, E',\n') ||
                        E'\n);'
                        FROM information_schema.columns
                        WHERE table_name = $1
                        GROUP BY table_name
                    `, [table]);

                    sqlDump += createTable.rows[0]?.create || '';
                    sqlDump += '\n\n';
                }
            }

            if (includeData) {
                const tables = await pool.query(`
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                `);

                for (const row of tables.rows) {
                    const table = row.table_name;
                    const data = await pool.query(`SELECT * FROM ${table}`);

                    data.rows.forEach(record => {
                        const values = Object.values(record)
                            .map(v => v === null ? 'NULL' : `'${v}'`)
                            .join(',');

                        sqlDump += `INSERT INTO ${table} VALUES (${values});\n`;
                    });

                    sqlDump += '\n';
                }
            }

            fs.writeFileSync(filePath, sqlDump);

            res.json({
                message: 'SQL бэкап создан',
                filename,
                size: `${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Ошибка создания SQL бэкапа' });
        }
    }

    async createJsonBackup(req, res) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${timestamp}.json`;
            const filePath = path.join(BACKUP_DIR, filename);

            const tables = await pool.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
            `);

            const dump = {};

            for (const row of tables.rows) {
                const table = row.table_name;
                const data = await pool.query(`SELECT * FROM ${table}`);
                dump[table] = data.rows;
            }

            fs.writeFileSync(filePath, JSON.stringify(dump, null, 2));

            res.json({
                message: 'JSON бэкап создан',
                filename,
                size: `${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`
            });
        } catch (error) {
            res.status(500).json({ error: 'Ошибка создания JSON бэкапа' });
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

        fs.unlinkSync(filePath);
        res.json({ message: 'Бэкап удалён' });
    }
}

module.exports = new BackupController();
