const pool = require('../config/database');
const encryption = require('../utils/encryption');

class AuditController {
    async getAuditLog(req, res) {
        try {
            const { limit = 100, offset = 0, action, table_name, start_date, end_date } = req.query;
            
            let query = `
                SELECT 
                    al.audit_id as id,
                    al.audit_action as action,
                    al.audit_table as table_name,
                    al.table_id,
                    al.old_data,
                    al.new_data,
                    al.created_at,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.user_id
                FROM audit_log al
                LEFT JOIN users u ON al.user_id = u.user_id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 1;
            
            if (action) {
                query += ` AND al.audit_action = $${paramCount}`;
                params.push(action);
                paramCount++;
            }
            
            if (table_name) {
                query += ` AND al.audit_table = $${paramCount}`;
                params.push(table_name);
                paramCount++;
            }
            
            if (start_date) {
                query += ` AND al.created_at >= $${paramCount}`;
                params.push(start_date);
                paramCount++;
            }
            
            if (end_date) {
                query += ` AND al.created_at <= $${paramCount}`;
                params.push(end_date);
                paramCount++;
            }
            
            query += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(parseInt(limit), parseInt(offset));
            
            const result = await pool.query(query, params);
            
            const logsWithDecryptedNames = result.rows.map(log => {
                const logObj = { ...log };
                
                if (log.first_name && log.last_name) {
                    try {
                        const decryptedFirstName = encryption.decryptFromDB(log.first_name);
                        const decryptedLastName = encryption.decryptFromDB(log.last_name);
                        logObj.user_name = `${decryptedFirstName} ${decryptedLastName}`;
                    } catch (error) {
                        console.error('Ошибка дешифрования:', error);
                        logObj.user_name = log.email || 'Пользователь';
                    }
                } else {
                    logObj.user_name = 'Система';
                }
                
                delete logObj.first_name;
                delete logObj.last_name;
                
                return logObj;
            });
            
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM audit_log al
                WHERE 1=1
                ${action ? ' AND al.audit_action = $1' : ''}
                ${table_name ? ` AND al.audit_table = $${action ? 2 : 1}` : ''}
            `;
            
            const countParams = [];
            if (action) countParams.push(action);
            if (table_name) countParams.push(table_name);
            
            const countResult = await pool.query(countQuery, countParams.length > 0 ? countParams : undefined);
            
            res.json({
                logs: logsWithDecryptedNames,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
            
        } catch (error) {
            console.error('Ошибка получения журнала аудита:', error);
            res.status(500).json({ error: 'Ошибка получения журнала аудита' });
        }
    }

    async getAuditStats(req, res) {
        try {
            const stats = await pool.query(`
                SELECT 
                    audit_action as action,
                    COUNT(*) as count,
                    MIN(created_at) as first_occurrence,
                    MAX(created_at) as last_occurrence
                FROM audit_log
                GROUP BY audit_action
                ORDER BY count DESC
            `);
            
            const tables = await pool.query(`
                SELECT 
                    audit_table as table_name,
                    COUNT(*) as count
                FROM audit_log
                GROUP BY audit_table
                ORDER BY count DESC
            `);
            
            const usersResult = await pool.query(`
                SELECT 
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    COUNT(*) as action_count
                FROM audit_log al
                LEFT JOIN users u ON al.user_id = u.user_id
                GROUP BY u.user_id, u.first_name, u.last_name, u.email
                ORDER BY action_count DESC
                LIMIT 10
            `);
            
            const topUsers = usersResult.rows.map(user => {
                try {
                    if (user.first_name && user.last_name) {
                        const decryptedFirstName = encryption.decryptFromDB(user.first_name);
                        const decryptedLastName = encryption.decryptFromDB(user.last_name);
                        return {
                            user_name: `${decryptedFirstName} ${decryptedLastName}`,
                            action_count: user.action_count
                        };
                    } else {
                        return {
                            user_name: user.email || 'Система',
                            action_count: user.action_count
                        };
                    }
                } catch (error) {
                    console.error('Ошибка дешифрования:', error);
                    return {
                        user_name: user.email || 'Система',
                        action_count: user.action_count
                    };
                }
            });
            
            res.json({
                actions: stats.rows,
                tables: tables.rows,
                top_users: topUsers,
                total_logs: stats.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
            });
            
        } catch (error) {
            console.error('Ошибка получения статистики аудита:', error);
            res.status(500).json({ error: 'Ошибка получения статистики аудита' });
        }
    }

    async getAuditActions(req, res) {
        try {
            const result = await pool.query(`
                SELECT DISTINCT audit_action as action
                FROM audit_log
                ORDER BY audit_action
            `);
            
            res.json(result.rows.map(row => row.action));
        } catch (error) {
            console.error('Ошибка получения списка действий:', error);
            res.status(500).json({ error: 'Ошибка получения списка действий' });
        }
    }

    async getAuditTables(req, res) {
        try {
            const result = await pool.query(`
                SELECT DISTINCT audit_table as table_name
                FROM audit_log
                ORDER BY audit_table
            `);
            
            res.json(result.rows.map(row => row.table_name));
        } catch (error) {
            console.error('Ошибка получения списка таблиц:', error);
            res.status(500).json({ error: 'Ошибка получения списка таблиц' });
        }
    }
}

module.exports = new AuditController();