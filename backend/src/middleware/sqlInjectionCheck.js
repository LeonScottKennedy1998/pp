// middleware/sqlInjectionCheck.js
const sqlInjectionCheck = (req, res, next) => {
    const checkForSQLInjection = (value) => {
        if (typeof value !== 'string') return false;
        
        // Простые паттерны SQL-инъекций
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
            /(\b(OR|AND)\s+['"]?\d+['"]?\s*[=<>])/i,
            /(--|\/\*|\*\/|;)/,
            /(\b(EXEC|EXECUTE|DECLARE)\b)/i,
            /(\b(WAITFOR DELAY|SLEEP)\b)/i
        ];
        
        return sqlPatterns.some(pattern => pattern.test(value));
    };
    
    // Проверяем body
    if (req.body) {
        const bodyValues = Object.values(req.body).flat();
        for (const value of bodyValues) {
            if (checkForSQLInjection(String(value))) {
                console.warn('⚠️ Обнаружена попытка SQL-инъекции:', {
                    ip: req.ip,
                    url: req.url,
                    data: value
                });
                
                // Логируем в аудит
                req.app.locals.db.query(
                    `INSERT INTO audit_log 
                     (user_id, audit_action, audit_table, new_data)
                     VALUES ($1, 'SQL_INJECTION_ATTEMPT', 'security', $2)`,
                    [req.user?.userId || null, 
                     JSON.stringify({
                         ip: req.ip,
                         url: req.url,
                         userAgent: req.headers['user-agent'],
                         timestamp: new Date().toISOString()
                     })]
                );
                
                return res.status(400).json({ 
                    error: 'Некорректные данные в запросе' 
                });
            }
        }
    }
    
    // Проверяем query params
    if (req.query) {
        const queryValues = Object.values(req.query).flat();
        for (const value of queryValues) {
            if (checkForSQLInjection(String(value))) {
                console.warn('⚠️ SQL-инъекция в query params:', req.query);
                return res.status(400).json({ 
                    error: 'Некорректные параметры запроса' 
                });
            }
        }
    }
    
    next();
};

module.exports = sqlInjectionCheck;