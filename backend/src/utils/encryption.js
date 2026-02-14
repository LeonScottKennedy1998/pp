const crypto = require('crypto');

class EncryptionService {
    constructor() {
        this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
        if (this.key.length !== 32) {
            throw new Error('ENCRYPTION_KEY должен быть 32 байта в hex формате');
        }
        this.algorithm = 'aes-256-cbc';
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                iv: iv.toString('hex'),
                content: encrypted
            };
        } catch (error) {
            console.error('Ошибка шифрования:', error);
            throw new Error('Ошибка шифрования данных');
        }
    }

    decrypt(encryptedData) {
        try {
            if (!encryptedData || !encryptedData.iv || !encryptedData.content) {
                throw new Error('Некорректные данные для дешифрования');
            }
            
            const decipher = crypto.createDecipheriv(
                this.algorithm, 
                this.key, 
                Buffer.from(encryptedData.iv, 'hex')
            );
            
            let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Ошибка дешифрования:', error);
            throw new Error('Ошибка дешифрования данных');
        }
    }

    encryptForDB(text) {
        const encrypted = this.encrypt(text);
        return JSON.stringify(encrypted);
    }

    decryptFromDB(encryptedJSON) {
        try {
            const encryptedData = JSON.parse(encryptedJSON);
            return this.decrypt(encryptedData);
        } catch (error) {
            console.error('Ошибка парсинга JSON:', error);
            throw error;
        }
    }
}

module.exports = new EncryptionService();