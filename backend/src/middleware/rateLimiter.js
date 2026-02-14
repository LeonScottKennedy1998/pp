// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Лимит для входа: 5 попыток за 15 минут
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // Максимум 5 запросов
    message: {
        error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
        resetTime: '15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Не считаем успешные входы
});

// Лимит для регистрации: 3 попытки за час
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3,
    message: {
        error: 'Слишком много попыток регистрации. Попробуйте через час.',
        resetTime: '1 час'
    }
});

// Лимит для сброса пароля: 3 попытки за час
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        error: 'Слишком много запросов на сброс пароля. Попробуйте через час.',
        resetTime: '1 час'
    }
});

module.exports = { loginLimiter, registerLimiter, passwordResetLimiter };