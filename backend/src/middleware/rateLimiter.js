const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
        resetTime: '15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        error: 'Слишком много попыток регистрации. Попробуйте через час.',
        resetTime: '1 час'
    }
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        error: 'Слишком много запросов на сброс пароля. Попробуйте через час.',
        resetTime: '1 час'
    }
});

module.exports = { loginLimiter, registerLimiter, passwordResetLimiter };