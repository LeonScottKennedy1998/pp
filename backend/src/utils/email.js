const nodemailer = require('nodemailer');
const { PerformanceMonitor } = require('../middleware/performanceMonitor');
const monitor = new PerformanceMonitor();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
    },
    requireTLS: false,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000
});

transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Ошибка подключения к почте:', error);
    } else {
        console.log('✅ Почтовый сервер готов к отправке');
    }
});

const sendEmailWithMetrics = async (mailOptions) => {
    const startTime = process.hrtime();
    
    try {
        console.log(`📧 Попытка отправки email на: ${mailOptions.to}`);
        console.log(`📧 Тема письма: ${mailOptions.subject}`);
        
        const info = await transporter.sendMail(mailOptions);
        const endTime = process.hrtime(startTime);
        
        const durationMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
        
        console.log(`✅ Email отправлен успешно за ${durationMs.toFixed(2)} мс`);
        console.log(`📧 ID сообщения: ${info.messageId}`);
        console.log(`📧 Ответ сервера: ${info.response}`);
        
        await monitor.saveEmailSendTime(mailOptions.to, durationMs, true);
        
        return {
            success: true,
            messageId: info.messageId,
            durationMs: durationMs
        };
        
    } catch (error) {
        const endTime = process.hrtime(startTime);
        const durationMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
        
        console.error('❌ Ошибка отправки email:');
        console.error(`📧 Адрес: ${mailOptions.to}`);
        console.error(`📧 Тема: ${mailOptions.subject}`);
        console.error(`📧 Ошибка: ${error.message}`);
        console.error(`📧 Код ошибки: ${error.code || 'N/A'}`);
        console.error(`📧 Команда SMTP: ${error.command || 'N/A'}`);
        
        await monitor.saveEmailSendTime(mailOptions.to, durationMs, false);
        
        return {
            success: false,
            error: error.message,
            durationMs: durationMs
        };
    }
};

const sendResetEmail = async (toEmail, resetLink) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: 'Восстановление пароля - Магазин МПТ',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; background-color: #2c3e50; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">Магазин МПТ</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Восстановление пароля</p>
                </div>
                
                <div style="padding: 30px 20px;">
                    <h2 style="color: #2c3e50; margin-top: 0;">Здравствуйте!</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        Вы запросили сброс пароля для вашего аккаунта в магазине МПТ.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #3498db; 
                                  color: white; 
                                  padding: 14px 28px; 
                                  text-decoration: none; 
                                  border-radius: 6px;
                                  font-size: 16px;
                                  font-weight: bold;
                                  display: inline-block;">
                            Сбросить пароль
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #7f8c8d; line-height: 1.5;">
                        <strong>Или скопируйте ссылку:</strong><br>
                        <span style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; display: block; margin-top: 5px;">
                            ${resetLink}
                        </span>
                    </p>
                    
                    <div style="background-color: #fff9e6; padding: 15px; border-radius: 5px; margin-top: 25px;">
                        <p style="margin: 0; color: #e67e22; font-size: 14px;">
                            ⚠️ <strong>Важно:</strong> Ссылка действительна в течение <strong>1 часа</strong>.<br>
                            Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
                        </p>
                    </div>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #7f8c8d; font-size: 12px;">
                        Магазин МПТ | Московский Приборостроительный Техникум<br>
                        Это автоматическое письмо, пожалуйста, не отвечайте на него.
                    </p>
                </div>
            </div>
        `
    };

    console.log(`📧 === Начало отправки письма для восстановления пароля ===`);
    console.log(`📧 Получатель: ${toEmail}`);
    console.log(`📧 Ссылка для сброса: ${resetLink}`);
    
    const result = await sendEmailWithMetrics(mailOptions);
    
    if (result.success) {
        console.log(`✅ === Письмо восстановления отправлено успешно ===`);
        console.log(`✅ Время отправки: ${result.durationMs.toFixed(2)} мс`);
        console.log(`✅ ID сообщения: ${result.messageId}`);
    } else {
        console.error(`❌ === Ошибка отправки письма восстановления ===`);
        console.error(`❌ Ошибка: ${result.error}`);
    }
    
    return result.success;
};

const sendTwoFactorEmail = async (email, code) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Код двухфакторной аутентификации | Магазин МПТ',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; background-color: #2c3e50; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0;">Магазин МПТ</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">Двухфакторная аутентификация</p>
                </div>
                
                <div style="padding: 30px 20px; text-align: center;">
                    <h2 style="color: #2c3e50; margin-top: 0;">Ваш код подтверждения</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #333;">
                        Для завершения входа в систему используйте следующий код:
                    </p>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin: 25px 0; border: 2px dashed #3498db;">
                        <h1 style="color: #3498db; font-size: 42px; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace;">
                            ${code}
                        </h1>
                    </div>
                    
                    <div style="background-color: #e8f4fc; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: left;">
                        <p style="margin: 0 0 10px 0; color: #2c3e50; font-size: 14px;">
                            <strong>📋 Информация:</strong>
                        </p>
                        <ul style="margin: 0; padding-left: 20px; color: #5a6268; font-size: 14px;">
                            <li>Срок действия кода: <strong>10 минут</strong></li>
                            <li>Код можно использовать только один раз</li>
                            <li>Не передавайте код третьим лицам</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #fff9e6; padding: 15px; border-radius: 5px; margin-top: 25px;">
                        <p style="margin: 0; color: #e67e22; font-size: 14px;">
                            ⚠️ <strong>Безопасность:</strong> Если вы не запрашивали вход в систему, 
                            проигнорируйте это письмо и свяжитесь с администрацией.
                        </p>
                    </div>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #7f8c8d; font-size: 12px;">
                        Магазин МПТ | Московский Приборостроительный Техникум<br>
                        Это автоматическое письмо, пожалуйста, не отвечайте на него.
                    </p>
                </div>
            </div>
        `
    };
    
    console.log(`📧 === Начало отправки кода 2FA ===`);
    console.log(`📧 Получатель: ${email}`);
    console.log(`📧 Код 2FA: ${code}`);
    
    const result = await sendEmailWithMetrics(mailOptions);
    
    if (result.success) {
        console.log(`✅ === Код 2FA отправлен успешно ===`);
        console.log(`✅ Время отправки: ${result.durationMs.toFixed(2)} мс`);
    } else {
        console.error(`❌ === Ошибка отправки кода 2FA ===`);
        console.error(`❌ Ошибка: ${result.error}`);
    }
    
    return result.success;
};



module.exports = { 
    sendResetEmail, 
    sendTwoFactorEmail,
    transporter
};