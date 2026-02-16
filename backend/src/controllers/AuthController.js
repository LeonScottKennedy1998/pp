const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateToken } = require('../utils/token');
const encryption = require('../utils/encryption');
const crypto = require('crypto');
const { sendTwoFactorEmail } = require('../utils/email');

const generateSixDigitCode = () => {
    const min = 100000;
    const max = 999999;
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const code = min + (randomNumber % (max - min + 1));
    return code.toString();
};

class AuthController {
    async register(req, res) {
        try {
            const { email, password, first_name, last_name, patronymic, phone } = req.body;
            
            if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Пароль должен содержать минимум 6 символов' 
            });
        }
        
        const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                error: 'Неверный формат телефона' 
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
            
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            
            const encryptedFirstName = encryption.encryptForDB(first_name);
            const encryptedLastName = encryption.encryptForDB(last_name);
            const encryptedPatronymic = patronymic ? encryption.encryptForDB(patronymic) : null;
            
            const result = await pool.query(
                `INSERT INTO users 
                 (email, password_hash, first_name, last_name, patronymic, phone, role_id)
                 VALUES ($1, $2, $3, $4, $5, $6, 4)
                 RETURNING user_id, email, created_at`,
                [email, passwordHash, encryptedFirstName, encryptedLastName, encryptedPatronymic, phone]
            );
            
            const token = generateToken(
                result.rows[0].user_id,
                email,
                'Клиент'
            );
            
            res.status(201).json({
                message: 'Регистрация успешна',
                token,
                user: {
                    id: result.rows[0].user_id,
                    email: result.rows[0].email,
                    role: 'Клиент'
                }
            });
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            res.status(500).json({ error: 'Ошибка при регистрации' });
        }
    }
    

async login(req, res) {
    try {
        const { email, password, twoFactorCode } = req.body;
        
        console.log('🔐 Попытка входа для:', email);
        
        const result = await pool.query(
            `SELECT u.*, r.role_name 
             FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }
        
        const user = result.rows[0];
        
        if (!user.is_active) {
            console.log('🚫 Заблокированный пользователь пытается войти:', email);
            return res.status(403).json({ 
                error: 'Ваш аккаунт заблокирован. Обратитесь к администратору.',
                code: 'ACCOUNT_BLOCKED'
            });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ 
                error: 'Неверный email или пароль' 
            });
        }
        
        if (user.two_factor_enabled) {
            console.log('🔐 2FA включена для пользователя:', email);
            
            if (!twoFactorCode) {
                const code = generateSixDigitCode();

                const expires = new Date(Date.now() + 10 * 60 * 1000);
                
                await pool.query(
                    `UPDATE users 
                     SET two_factor_code = $1, two_factor_expires = $2
                     WHERE user_id = $3`,
                    [code, expires, user.user_id]
                );
                
                setImmediate(async () => {
                try {
                    await sendTwoFactorEmail(user.email, code);
                } catch (emailError) {
                    console.error('Ошибка отправки email:', emailError);
                }
            });
                
                console.log('✅ Код 2FA отправлен на:', user.email);
                
                    return res.status(200).json({
                    message: 'Требуется двухфакторная аутентификация',
                    requiresTwoFactor: true,
                    email: user.email,
                    expiresIn: '10 минут',
                    userId: user.user_id
                });
            }
            
            console.log('🔐 Проверка кода 2FA для пользователя:', user.user_id);
            
            const twoFactorCheck = await pool.query(
                `SELECT two_factor_code, two_factor_expires 
                 FROM users 
                 WHERE user_id = $1 AND two_factor_code = $2`,
                [user.user_id, twoFactorCode]
            );
            
            if (twoFactorCheck.rows.length === 0) {
                console.log('❌ Неверный код 2FA');
                return res.status(401).json({ 
                    error: 'Неверный код аутентификации' 
                });
            }
            
            const twoFactorData = twoFactorCheck.rows[0];
            
            if (new Date() > new Date(twoFactorData.two_factor_expires)) {
                console.log('❌ Срок действия кода истёк');
                return res.status(401).json({ 
                    error: 'Срок действия кода истёк. Запросите новый.' 
                });
            }
            
            await pool.query(
                `UPDATE users 
                 SET two_factor_code = NULL, two_factor_expires = NULL
                 WHERE user_id = $1`,
                [user.user_id]
            );
            
            console.log('✅ Код 2FA подтверждён');
        }
        
        let decryptedFirstName = '';
        let decryptedLastName = '';
        let decryptedPatronymic = '';
        
        try {
            decryptedFirstName = encryption.decryptFromDB(user.first_name);
            decryptedLastName = encryption.decryptFromDB(user.last_name);
            if (user.patronymic) {
                decryptedPatronymic = encryption.decryptFromDB(user.patronymic);
            }
        } catch (decryptError) {
            console.error('Ошибка дешифрования:', decryptError);
            decryptedFirstName = 'Пользователь';
            decryptedLastName = '';
        }
        
        const token = generateToken(
            user.user_id,
            user.email,
            user.role_name
        );
        
        console.log('✅ Вход успешен для:', user.email);
        
        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role_name,
                first_name: decryptedFirstName,
                last_name: decryptedLastName,
                patronymic: decryptedPatronymic,
                phone: user.phone,
                is_active: user.is_active,
                two_factor_enabled: user.two_factor_enabled
            }
        });
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
}
    
async enableTwoFactor(req, res) {
    try {
        const userId = req.user.userId;
        
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        
        await pool.query(
            `UPDATE users 
             SET two_factor_code = $1, 
                 two_factor_expires = $2
             WHERE user_id = $3`,
            [verificationCode, expires, userId]
        );
        
        const userResult = await pool.query(
            'SELECT email FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const userEmail = userResult.rows[0].email;
        
        setImmediate(async () => {
            try {
                console.log('📧 Асинхронная отправка кода 2FA на:', userEmail);
                const start = Date.now();
                await sendTwoFactorEmail(userEmail, verificationCode);
                const duration = Date.now() - start;
                console.log(`📧 Email отправлен асинхронно за ${duration} мс`);
            } catch (emailError) {
                console.error('❌ Ошибка асинхронной отправки email:', emailError);
            }
        });
        
        res.json({
            message: 'Код подтверждения отправлен на ваш email',
            requiresVerification: true,
            expiresIn: '10 минут'
        });
        
        console.log(`✅ Ответ отправлен пользователю за ${Date.now() - req.startTime} мс`);
        
    } catch (error) {
        console.error('Ошибка включения 2FA:', error);
        res.status(500).json({ error: 'Ошибка включения двухфакторной аутентификации' });
    }
}

async verifyTwoFactorSetup(req, res) {
    try {
        const userId = req.user.userId;
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                error: 'Код подтверждения обязателен' 
            });
        }
        
        const result = await pool.query(
            `SELECT two_factor_code, two_factor_expires 
             FROM users 
             WHERE user_id = $1 AND two_factor_code = $2`,
            [userId, code]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Неверный код подтверждения' 
            });
        }
        
        const twoFactorData = result.rows[0];
        
        if (new Date() > new Date(twoFactorData.two_factor_expires)) {
            return res.status(401).json({ 
                error: 'Срок действия кода истёк' 
            });
        }
        
        await pool.query(
            `UPDATE users 
             SET two_factor_enabled = true,
                 two_factor_code = NULL,
                 two_factor_expires = NULL
             WHERE user_id = $1`,
            [userId]
        );
        
        await pool.query(
            `INSERT INTO audit_log 
             (user_id, audit_action, audit_table, table_id, new_data)
             VALUES ($1, 'ENABLE_2FA', 'users', $2, $3)`,
            [userId, userId, JSON.stringify({ action: 'two_factor_enabled' })]
        );
        
        res.json({
            message: 'Двухфакторная аутентификация успешно включена',
            two_factor_enabled: true
        });
        
    } catch (error) {
        console.error('Ошибка подтверждения 2FA:', error);
        res.status(500).json({ error: 'Ошибка подтверждения двухфакторной аутентификации' });
    }
}

async disableTwoFactor(req, res) {
    try {
        const userId = req.user.userId;
        
        await pool.query(
            `UPDATE users 
             SET two_factor_enabled = false,
                 two_factor_code = NULL,
                 two_factor_expires = NULL
             WHERE user_id = $1`,
            [userId]
        );
        
        await pool.query(
            `INSERT INTO audit_log 
             (user_id, audit_action, audit_table, table_id, new_data)
             VALUES ($1, 'DISABLE_2FA', 'users', $2, $3)`,
            [userId, userId, JSON.stringify({ action: 'two_factor_disabled' })]
        );
        
        res.json({
            message: 'Двухфакторная аутентификация отключена',
            two_factor_enabled: false
        });
        
    } catch (error) {
        console.error('Ошибка отключения 2FA:', error);
        res.status(500).json({ error: 'Ошибка отключения двухфакторной аутентификации' });
    }
}

async resendTwoFactorCode(req, res) {
    try {
        const { email, userId } = req.body;
        
        let queryUserId = userId;
        
        if (!queryUserId && email) {
            const userResult = await pool.query(
                'SELECT user_id FROM users WHERE email = $1',
                [email]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }
            
            queryUserId = userResult.rows[0].user_id;
        }
        
        if (!queryUserId) {
            return res.status(400).json({ 
                error: 'Необходим email или userId' 
            });
        }
        
        const userResult = await pool.query(
            'SELECT email FROM users WHERE user_id = $1',
            [queryUserId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Пользователь не найден' 
            });
        }
        
        const userEmail = userResult.rows[0].email;
        
        const code = generateSixDigitCode();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        
        await pool.query(
            `UPDATE users 
             SET two_factor_code = $1, two_factor_expires = $2
             WHERE user_id = $3`,
            [code, expires, queryUserId]
        );
        
        setImmediate(async () => {
            try {
                console.log('📧 Асинхронная отправка 2FA кода на:', userEmail);
                const start = Date.now();
                
                const emailSent = await sendTwoFactorEmail(userEmail, code);
                
                const duration = Date.now() - start;
                
                if (emailSent) {
                    console.log(`📧 2FA код отправлен за ${duration} мс`);
                } else {
                    console.error('❌ Ошибка отправки 2FA кода');
                }
            } catch (emailError) {
                console.error('❌ Ошибка асинхронной отправки 2FA кода:', emailError);
            }
        });
        
        res.json({
            message: 'Новый код отправлен на email',
            expiresIn: '10 минут'
        });
        
    } catch (error) {
        console.error('Ошибка повторной отправки кода:', error);
        res.status(500).json({ error: 'Ошибка отправки кода' });
    }
}

    async checkTwoFactorStatus(req, res) {
    try {
        const userId = req.user.userId;
        
        const result = await pool.query(
            'SELECT two_factor_enabled FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({
            two_factor_enabled: result.rows[0].two_factor_enabled
        });
        
    } catch (error) {
        console.error('Ошибка проверки статуса 2FA:', error);
        res.status(500).json({ error: 'Ошибка проверки статуса двухфакторной аутентификации' });
    }
}
    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            
            const result = await pool.query(
                `SELECT u.*, r.role_name 
                 FROM users u
                 JOIN roles r ON u.role_id = r.role_id
                 WHERE u.user_id = $1`,
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const user = result.rows[0];
            
            let decryptedFirstName = '';
            let decryptedLastName = '';
            let decryptedPatronymic = '';
            
            try {
                decryptedFirstName = encryption.decryptFromDB(user.first_name);
                decryptedLastName = encryption.decryptFromDB(user.last_name);
                if (user.patronymic) {
                    decryptedPatronymic = encryption.decryptFromDB(user.patronymic);
                }
            } catch (decryptError) {
                console.error('Ошибка дешифрования:', decryptError);
            }
            
            res.json({
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role_name,
                    first_name: decryptedFirstName,
                    last_name: decryptedLastName,
                    patronymic: decryptedPatronymic,
                    phone: user.phone,
                    is_active: user.is_active,
                    created_at: user.created_at
                }
            });
            
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            res.status(500).json({ error: 'Ошибка получения профиля' });
        }
    }
    
    logout(req, res) {
        res.json({ message: 'Выход выполнен успешно' });
    }
    

    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { first_name, last_name, patronymic, phone } = req.body;
            
            const userExists = await pool.query(
                'SELECT * FROM users WHERE user_id = $1',
                [userId]
            );
            
            if (userExists.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const oldUserData = userExists.rows[0];
            
            const encryptedFirstName = first_name 
                ? encryption.encryptForDB(first_name) 
                : oldUserData.first_name;
                
            const encryptedLastName = last_name 
                ? encryption.encryptForDB(last_name) 
                : oldUserData.last_name;
                
            const encryptedPatronymic = patronymic !== undefined
                ? (patronymic ? encryption.encryptForDB(patronymic) : null)
                : oldUserData.patronymic;
            
            const result = await pool.query(
                `UPDATE users 
                 SET first_name = $1,
                     last_name = $2,
                     patronymic = $3,
                     phone = COALESCE($4, phone)
                 WHERE user_id = $5
                 RETURNING user_id, email, phone, created_at`,
                [encryptedFirstName, encryptedLastName, encryptedPatronymic, phone, userId]
            );
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, old_data, new_data)
                 VALUES ($1, 'UPDATE_PROFILE', 'users', $2, $3, $4)`,
                [userId, userId,
                 JSON.stringify({
                     first_name: oldUserData.first_name,
                     last_name: oldUserData.last_name,
                     patronymic: oldUserData.patronymic,
                     phone: oldUserData.phone
                 }),
                 JSON.stringify({
                     first_name: encryptedFirstName,
                     last_name: encryptedLastName,
                     patronymic: encryptedPatronymic,
                     phone: phone || oldUserData.phone
                 })]
            );
            
            const updatedUser = await pool.query(
                `SELECT u.*, r.role_name 
                 FROM users u
                 JOIN roles r ON u.role_id = r.role_id
                 WHERE u.user_id = $1`,
                [userId]
            );
            
            const user = updatedUser.rows[0];
            
            let decryptedFirstName = '';
            let decryptedLastName = '';
            let decryptedPatronymic = '';
            
            try {
                decryptedFirstName = encryption.decryptFromDB(user.first_name);
                decryptedLastName = encryption.decryptFromDB(user.last_name);
                if (user.patronymic) {
                    decryptedPatronymic = encryption.decryptFromDB(user.patronymic);
                }
            } catch (decryptError) {
                console.error('Ошибка дешифрования:', decryptError);
            }
            
            res.json({
                message: 'Профиль успешно обновлен',
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role_name,
                    first_name: decryptedFirstName,
                    last_name: decryptedLastName,
                    patronymic: decryptedPatronymic,
                    phone: user.phone,
                    is_active: user.is_active,
                    created_at: user.created_at
                }
            });
            
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            res.status(500).json({ error: 'Ошибка обновления профиля' });
        }
    }
    
    async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ 
                    error: 'Текущий и новый пароль обязательны' 
                });
            }
            
            if (newPassword.length < 6) {
                return res.status(400).json({ 
                    error: 'Новый пароль должен содержать минимум 6 символов' 
                });
            }
            
            const result = await pool.query(
                'SELECT password_hash FROM users WHERE user_id = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            const user = result.rows[0];
            
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Неверный текущий пароль' });
            }
            
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            
            await pool.query(
                `UPDATE users 
                 SET password_hash = $1
                 WHERE user_id = $2`,
                [newPasswordHash, userId]
            );
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'CHANGE_PASSWORD', 'users', $2, $3)`,
                [userId, userId, JSON.stringify({ action: 'password_changed' })]
            );
            
            res.json({ message: 'Пароль успешно изменен' });
            
        } catch (error) {
            console.error('Ошибка смены пароля:', error);
            res.status(500).json({ error: 'Ошибка смены пароля' });
        }
    }

    async forgotPassword(req, res) {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                error: 'Email обязателен для восстановления пароля' 
            });
        }
        
        const result = await pool.query(
            'SELECT user_id, email FROM users WHERE email = $1 AND is_active = true',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Пользователь с таким email не найден или аккаунт неактивен' 
            });
        }
        
        const user = result.rows[0];
        
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000);
        
        await pool.query(
            `UPDATE users 
             SET reset_token = $1, reset_token_expires = $2
             WHERE user_id = $3`,
            [resetToken, resetTokenExpires, user.user_id]
        );
        
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        
        setImmediate(async () => {
            try {
                console.log('📧 Асинхронная отправка email для сброса пароля на:', user.email);
                const start = Date.now();
                
                const { sendResetEmail } = require('../utils/email');
                const emailSent = await sendResetEmail(user.email, resetLink);
                
                const duration = Date.now() - start;
                
                if (emailSent) {
                    console.log(`📧 Email для сброса пароля отправлен за ${duration} мс`);
                } else {
                    console.error('❌ Ошибка отправки email для сброса пароля');
                    
                    await pool.query(
                        `INSERT INTO audit_log 
                         (user_id, audit_action, audit_table, table_id, new_data)
                         VALUES ($1, 'PASSWORD_RESET_EMAIL_FAILED', 'users', $2, $3)`,
                        [user.user_id, user.user_id, JSON.stringify({ 
                            error: 'Failed to send reset email',
                            timestamp: new Date().toISOString()
                        })]
                    );
                }
            } catch (emailError) {
                console.error('❌ Ошибка асинхронной отправки email для сброса пароля:', emailError);
                
                try {
                    await pool.query(
                        `INSERT INTO audit_log 
                         (user_id, audit_action, audit_table, table_id, new_data)
                         VALUES ($1, 'PASSWORD_RESET_EMAIL_ERROR', 'users', $2, $3)`,
                        [user.user_id, user.user_id, JSON.stringify({ 
                            error: emailError.message,
                            timestamp: new Date().toISOString()
                        })]
                    );
                } catch (logError) {
                    console.error('Ошибка логирования:', logError);
                }
            }
        });
        
        res.json({ 
            message: 'Инструкции по сбросу пароля отправлены на email',
            debug: {
                email: user.email,
                token_generated: true,
                expires_in: '1 час'
            }
        });
        
        console.log(`✅ Ответ на запрос сброса пароля отправлен за ${Date.now() - req.startTime} мс`);
        
    } catch (error) {
        console.error('Ошибка запроса сброса пароля:', error);
        res.status(500).json({ error: 'Ошибка при запросе сброса пароля' });
    }
}

async validateResetToken(req, res) {
    try {
        const { token } = req.params;
        
        const result = await pool.query(
            `SELECT user_id, email, reset_token_expires 
             FROM users 
             WHERE reset_token = $1 
               AND reset_token_expires > NOW()`,
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Токен недействителен или истек срок действия' 
            });
        }
        
        const user = result.rows[0];
        
        res.json({ 
            valid: true, 
            email: user.email,
            message: 'Токен действителен'
        });
        
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(500).json({ error: 'Ошибка проверки токена' });
    }
}

async resetPassword(req, res) {
    try {
        const { token } = req.params;
        const { password } = req.body;
        
        const userResult = await pool.query(
            `SELECT user_id, reset_token_expires 
             FROM users 
             WHERE reset_token = $1 
               AND reset_token_expires > NOW()`,
            [token]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Токен недействителен или истек срок действия' 
            });
        }
        
        const userId = userResult.rows[0].user_id;
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        await pool.query(
            `UPDATE users 
             SET password_hash = $1,
                 reset_token = NULL,
                 reset_token_expires = NULL
             WHERE user_id = $2`,
            [passwordHash, userId]
        );
        
        await pool.query(
            `INSERT INTO audit_log 
             (user_id, audit_action, audit_table, table_id, new_data)
             VALUES ($1, 'PASSWORD_RESET', 'users', $2, $3)`,
            [userId, userId, JSON.stringify({ action: 'password_reset_completed' })]
        );
        
        res.json({ 
            message: 'Пароль успешно изменен',
            success: true
        });
        
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({ error: 'Ошибка при сбросе пароля' });
    }
}
}

module.exports = new AuthController();