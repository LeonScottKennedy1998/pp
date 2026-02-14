const { verifyToken } = require('../utils/token');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        const decoded = verifyToken(token);
        console.log('🔐 Декодированный токен:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Ошибка верификации токена:', error.message);
        return res.status(401).json({ error: 'Недействительный токен' });
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