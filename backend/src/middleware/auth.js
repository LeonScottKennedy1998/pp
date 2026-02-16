const { verifyToken } = require('../utils/token');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        const decoded = verifyToken(token);
        console.log('🔐 Декодированный токен:', decoded);
        
        try {
            const userResult = await pool.query(
                'SELECT is_active, user_id FROM users WHERE user_id = $1',
                [decoded.userId]
            );
            
            if (userResult.rows.length === 0) {
                console.log('🚫 Пользователь не найден в БД:', decoded.userId);
                return res.status(401).json({ 
                    error: 'Пользователь не найден',
                    code: 'USER_NOT_FOUND'
                });
            }
            
            const user = userResult.rows[0];
            
            if (!user.is_active) {
                console.log('🚫 Заблокированный пользователь пытается выполнить запрос:', decoded.email);
                
                await pool.query(
                    `INSERT INTO audit_log 
                     (user_id, audit_action, audit_table, new_data)
                     VALUES ($1, 'BLOCKED_USER_ACCESS_ATTEMPT', 'users', $2)`,
                    [decoded.userId, JSON.stringify({ 
                        path: req.path,
                        method: req.method,
                        timestamp: new Date().toISOString(),
                        token: token.substring(0, 20) + '...'
                    })]
                ).catch(err => console.error('Ошибка логирования:', err));
                
                return res.status(403).json({ 
                    error: 'Ваш аккаунт заблокирован. Обратитесь к администратору.',
                    code: 'ACCOUNT_BLOCKED'
                });
            }
            
        } catch (dbError) {
            console.error('❌ Ошибка проверки статуса пользователя в БД:', dbError);
            console.log('⚠️ Пропускаем запрос из-за ошибки БД');
        }
        
        req.user = decoded;
        next();
        
    } catch (error) {
        console.error('❌ Ошибка верификации токена:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Срок действия токена истек',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(401).json({ 
            error: 'Недействительный токен',
            code: 'INVALID_TOKEN'
        });
    }
};

const roleMiddleware = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        console.log('👤 Пользователь в roleMiddleware:', req.user);
        console.log('🎭 Роль пользователя:', req.user.role);
        console.log('🎯 Требуемые роли:', roles);
        
        if (!roles.includes(req.user.role)) {
            console.log('❌ Доступ запрещен! Роль пользователя не соответствует');
            return res.status(403).json({ 
                error: 'Доступ запрещен',
                userRole: req.user.role,
                requiredRoles: roles
            });
        }
        
        next();
    };
};

module.exports = { authMiddleware, roleMiddleware };