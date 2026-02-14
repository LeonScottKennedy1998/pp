const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const encryption = require('../utils/encryption');

class UserController {
   async getAllUsers(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    u.user_id as id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.patronymic,
                    u.phone,
                    u.is_active,
                    u.created_at,
                    r.role_name as role
                FROM users u
                JOIN roles r ON u.role_id = r.role_id
                ORDER BY u.created_at DESC
            `);
            
            const usersWithDecryptedNames = result.rows.map(user => {
                try {
                    return {
                        ...user,
                        first_name: user.first_name ? encryption.decryptFromDB(user.first_name) : '',
                        last_name: user.last_name ? encryption.decryptFromDB(user.last_name) : '',
                        patronymic: user.patronymic ? encryption.decryptFromDB(user.patronymic) : undefined
                    };
                } catch (error) {
                    console.error(`Ошибка дешифрования пользователя ${user.id}:`, error);
                    return {
                        ...user,
                        first_name: 'Ошибка дешифрования',
                        last_name: 'Ошибка дешифрования',
                        patronymic: undefined
                    };
                }
            });
            
            res.json(usersWithDecryptedNames);
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            res.status(500).json({ error: 'Ошибка получения пользователей' });
        }
    }

    async createUser(req, res) {
        try {
            const { email, password, first_name, last_name, patronymic, phone, role } = req.body;
            
            if (!email || !password || !first_name || !last_name || !phone || !role) {
                return res.status(400).json({ 
                    error: 'Все поля обязательны для заполнения' 
                });
            }
            
            const userExists = await pool.query(
                'SELECT user_id FROM users WHERE email = $1',
                [email]
            );
            
            if (userExists.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Пользователь с таким email уже существует' 
                });
            }
            
            const roleResult = await pool.query(
                'SELECT role_id FROM roles WHERE role_name = $1',
                [role]
            );
            
            if (roleResult.rows.length === 0) {
                return res.status(400).json({ error: 'Неверная роль' });
            }
            
            const role_id = roleResult.rows[0].role_id;
            
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            
            const encryptedFirstName = encryption.encryptForDB(first_name);
            const encryptedLastName = encryption.encryptForDB(last_name);
            const encryptedPatronymic = patronymic ? encryption.encryptForDB(patronymic) : null;
            
            const result = await pool.query(
                `INSERT INTO users 
                 (email, password_hash, first_name, last_name, patronymic, phone, role_id, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                 RETURNING user_id, email, created_at`,
                [email, passwordHash, encryptedFirstName, encryptedLastName, encryptedPatronymic, phone, role_id]
            );
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'CREATE_USER', 'users', $2, $3)`,
                [req.user.userId, result.rows[0].user_id, 
                 JSON.stringify({ email, role })]
            );
            
            res.status(201).json({
                message: 'Пользователь успешно создан',
                user: {
                    id: result.rows[0].user_id,
                    email: result.rows[0].email,
                    role: role,
                    created_at: result.rows[0].created_at
                }
            });
            
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
            res.status(500).json({ error: 'Ошибка создания пользователя' });
        }
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { first_name, last_name, patronymic, phone, role, is_active } = req.body;
            
            const currentUser = await pool.query(
                `SELECT u.*, r.role_name 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.role_id 
                 WHERE u.user_id = $1`,
                [id]
            );
            
            if (currentUser.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const oldData = currentUser.rows[0];
            
            let role_id = oldData.role_id;
            if (role) {
                const roleResult = await pool.query(
                    'SELECT role_id FROM roles WHERE role_name = $1',
                    [role]
                );
                
                if (roleResult.rows.length === 0) {
                    return res.status(400).json({ error: 'Неверная роль' });
                }
                
                role_id = roleResult.rows[0].role_id;
            }
            
            let updateData = {
                phone: phone || oldData.phone,
                role_id: role_id,
                is_active: is_active !== undefined ? is_active : oldData.is_active
            };
            
            if (first_name) {
                updateData.first_name = encryption.encryptForDB(first_name);
            }
            if (last_name) {
                updateData.last_name = encryption.encryptForDB(last_name);
            }
            if (patronymic !== undefined) {
                updateData.patronymic = patronymic ? encryption.encryptForDB(patronymic) : null;
            }
            
            const setClauses = [];
            const values = [];
            let paramCount = 1;
            
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined) {
                    setClauses.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });
            
            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'Нет данных для обновления' });
            }
            
            values.push(id);
            
            const result = await pool.query(
                `UPDATE users 
                 SET ${setClauses.join(', ')}
                 WHERE user_id = $${paramCount}
                 RETURNING user_id, email, phone, is_active, created_at`,
                values
            );
            
            const updatedUserResult = await pool.query(
                `SELECT 
                    u.user_id as id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.patronymic,
                    u.phone,
                    u.is_active,
                    u.created_at,
                    r.role_name as role
                 FROM users u
                 JOIN roles r ON u.role_id = r.role_id
                 WHERE u.user_id = $1`,
                [id]
            );
            
            if (updatedUserResult.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден после обновления' });
            }
            
            const encryptedUser = updatedUserResult.rows[0];
            
            const decryptedUser = {
                ...encryptedUser,
                first_name: encryptedUser.first_name ? encryption.decryptFromDB(encryptedUser.first_name) : '',
                last_name: encryptedUser.last_name ? encryption.decryptFromDB(encryptedUser.last_name) : '',
                patronymic: encryptedUser.patronymic ? encryption.decryptFromDB(encryptedUser.patronymic) : undefined
            };
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, old_data, new_data)
                 VALUES ($1, 'UPDATE_USER', 'users', $2, $3, $4)`,
                [req.user.userId, id, 
                 JSON.stringify({
                     email: oldData.email,
                     role: oldData.role_name,
                     is_active: oldData.is_active
                 }),
                 JSON.stringify({
                     email: decryptedUser.email,
                     role: decryptedUser.role,
                     is_active: decryptedUser.is_active
                 })]
            );
            
            res.json({
                message: 'Пользователь успешно обновлен',
                user: decryptedUser
            });
            
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            res.status(500).json({ error: 'Ошибка обновления пользователя' });
        }
    }

    async blockUser(req, res) {
        try {
            const { id } = req.params;
            
            if (parseInt(id) === req.user.userId) {
                return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
            }
            
            const result = await pool.query(
                `UPDATE users 
                 SET is_active = false
                 WHERE user_id = $1 AND is_active = true
                 RETURNING user_id, email`,
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден или уже заблокирован' });
            }
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'BLOCK_USER', 'users', $2, $3)`,
                [req.user.userId, id, JSON.stringify({ action: 'blocked' })]
            );
            
            res.json({
                message: 'Пользователь успешно заблокирован',
                user: result.rows[0]
            });
            
        } catch (error) {
            console.error('Ошибка блокировки пользователя:', error);
            res.status(500).json({ error: 'Ошибка блокировки пользователя' });
        }
    }

    async unblockUser(req, res) {
        try {
            const { id } = req.params;
            
            const result = await pool.query(
                `UPDATE users 
                 SET is_active = true
                 WHERE user_id = $1 AND is_active = false
                 RETURNING user_id, email`,
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден или уже активен' });
            }
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'UNBLOCK_USER', 'users', $2, $3)`,
                [req.user.userId, id, JSON.stringify({ action: 'unblocked' })]
            );
            
            res.json({
                message: 'Пользователь успешно разблокирован',
                user: result.rows[0]
            });
            
        } catch (error) {
            console.error('Ошибка разблокировки пользователя:', error);
            res.status(500).json({ error: 'Ошибка разблокировки пользователя' });
        }
    }

    async resetPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;
            
            if (!newPassword) {
                return res.status(400).json({ error: 'Новый пароль обязателен' });
            }
            
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);
            
            const result = await pool.query(
                `UPDATE users 
                 SET password_hash = $1
                 WHERE user_id = $2
                 RETURNING user_id, email`,
                [passwordHash, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'RESET_PASSWORD', 'users', $2, $3)`,
                [req.user.userId, id, JSON.stringify({ action: 'password_reset' })]
            );
            
            res.json({
                message: 'Пароль успешно сброшен',
                user: result.rows[0]
            });
            
        } catch (error) {
            console.error('Ошибка сброса пароля:', error);
            res.status(500).json({ error: 'Ошибка сброса пароля' });
        }
    }
}

module.exports = new UserController();