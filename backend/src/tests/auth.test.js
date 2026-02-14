const { generateToken, verifyToken } = require('../utils/token');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_secret_key_for_jwt_tokens_12345';
process.env.JWT_EXPIRES_IN = '24h';

const originalLog = console.log;
console.log = jest.fn();

describe('Модуль аутентификации', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    afterAll(() => {
        console.log = originalLog;
    });
    
    test('Генерация токена с корректными данными', () => {
        const userId = 123;
        const email = 'test@mpt.ru';
        const role = 'Клиент';
        
        const token = generateToken(userId, email, role);
        
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
        
        expect(console.log).toHaveBeenCalledWith(
            '🔐 Генерация токена для:',
            expect.objectContaining({ userId, email, role })
        );
    });
    
    test('Верификация валидного токена', () => {
        const testData = { userId: 123, email: 'test@mpt.ru', role: 'Клиент' };
        const token = generateToken(testData.userId, testData.email, testData.role);
        
        const decoded = verifyToken(token);
        
        expect(decoded.userId).toBe(testData.userId);
        expect(decoded.email).toBe(testData.email);
        expect(decoded.role).toBe(testData.role);
    });
    
    test('Ошибка при истечённом токене', () => {
        const expiredToken = jwt.sign(
            { userId: 123, email: 'test@mpt.ru', role: 'Клиент' },
            'test_secret_key_for_jwt_tokens_12345',
            { expiresIn: '-1s' }
        );
        
        expect(() => verifyToken(expiredToken)).toThrow('Недействительный токен');
    });
    
    test('Ошибка при повреждённом токене', () => {
        const invalidToken = 'invalid.token.string';
        
        expect(() => verifyToken(invalidToken)).toThrow('Недействительный токен');
    });
});