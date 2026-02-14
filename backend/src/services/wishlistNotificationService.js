const nodemailer = require('nodemailer');
const pool = require('../config/database');

class WishlistNotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER || process.env.SMTP_USER,
                pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS
            }
        });
    }

    async sendStockAvailableNotification(userEmail, product, userName) {
        if (!this.isEmailConfigured()) {
            console.log('Email не настроен, уведомление не будет отправлено');
            return false;
        }

        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 20px; }
                        .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                        .product-card { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd; }
                        .btn { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
                        .stock-badge { background: #2ecc71; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Товар снова в наличии!</h1>
                            <p>Магазин МПТ - товары с символикой Московского Приборостроительного Техникума</p>
                        </div>
                        
                        <div class="content">
                            <h2>Привет, ${userName}!</h2>
                            <p>Хорошие новости! Товар из вашего избранного снова доступен для заказа:</p>
                            
                            <div class="product-card">
                                <h3>${product.product_name}</h3>
                                <p><strong>Категория:</strong> ${product.category_name}</p>
                                <p><strong>Цена:</strong> ${product.price.toLocaleString()} ₽</p>
                                <p><span class="stock-badge">✓ В наличии: ${product.stock} шт.</span></p>
                                ${product.has_discount ? 
                                    `<p><strong style="color: #e74c3c;">🎁 Скидка: -${product.discount_percent}%</strong></p>
                                     <p><strong>Итоговая цена:</strong> ${product.final_price.toLocaleString()} ₽</p>` 
                                    : ''
                                }
                            </div>
                            
                            <p>Не упустите возможность заказать этот товар!</p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/catalog" class="btn">
                                Перейти к товару
                            </a>
                            
                            <p style="margin-top: 30px; color: #7f8c8d; font-size: 0.9em;">
                                Вы получили это письмо, потому что добавили этот товар в избранное на нашем сайте.
                                Чтобы отписаться от уведомлений, удалите товар из избранного.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>Магазин МПТ © ${new Date().getFullYear()}</p>
                            <p>Все права защищены</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: `"Магазин МПТ" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: `🎉 Товар "${product.product_name}" снова в наличии!`,
                html: htmlContent,
                text: `Товар "${product.product_name}" из вашего избранного снова в наличии! Цена: ${product.price} ₽. Перейдите в каталог: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/catalog`
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Уведомление о наличии отправлено на ${userEmail}`);
            return true;

        } catch (error) {
            console.error('❌ Ошибка отправки уведомления о наличии:', error);
            return false;
        }
    }

    async sendDiscountNotification(userEmail, product, userName, oldPrice, newPrice, discountPercent) {
        if (!this.isEmailConfigured()) {
            console.log('Email не настроен, уведомление не будет отправлено');
            return false;
        }

        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 20px; }
                        .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                        .product-card { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd; }
                        .btn { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
                        .discount-badge { background: #e74c3c; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; }
                        .old-price { text-decoration: line-through; color: #95a5a6; }
                        .new-price { color: #27ae60; font-size: 1.3em; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔥 Скидка на товар из избранного!</h1>
                            <p>Магазин МПТ - товары с символикой Московского Приборостроительного Техникума</p>
                        </div>
                        
                        <div class="content">
                            <h2>Привет, ${userName}!</h2>
                            <p>Спешим сообщить о скидке на товар из вашего избранного:</p>
                            
                            <div class="product-card">
                                <h3>${product.product_name}</h3>
                                <p><strong>Категория:</strong> ${product.category_name}</p>
                                <p>
                                    <span class="old-price">${oldPrice.toLocaleString()} ₽</span> 
                                    → 
                                    <span class="new-price">${newPrice.toLocaleString()} ₽</span>
                                </p>
                                <p><span class="discount-badge">-${discountPercent}%</span></p>
                                <p><strong>В наличии:</strong> ${product.stock} шт.</p>
                            </div>
                            
                            <p>Торопитесь, скидка может закончиться в любой момент!</p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/catalog" class="btn">
                                Перейти к товару
                            </a>
                            
                            <p style="margin-top: 30px; color: #7f8c8d; font-size: 0.9em;">
                                Вы получили это письмо, потому что добавили этот товар в избранное на нашем сайте.
                                Чтобы отписаться от уведомлений, удалите товар из избранного.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>Магазин МПТ © ${new Date().getFullYear()}</p>
                            <p>Все права защищены</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: `"Магазин МПТ" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: `🔥 Скидка ${discountPercent}% на "${product.product_name}"!`,
                html: htmlContent,
                text: `Скидка ${discountPercent}% на товар "${product.product_name}" из вашего избранного! Новая цена: ${newPrice} ₽ (было: ${oldPrice} ₽). Перейдите в каталог: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/catalog`
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Уведомление о скидке отправлено на ${userEmail}`);
            return true;

        } catch (error) {
            console.error('❌ Ошибка отправки уведомления о скидке:', error);
            return false;
        }
    }

    async shouldSendNotification(userId, productId, notificationType) {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            const result = await pool.query(
                `SELECT notification_id FROM wishlist_notifications 
                 WHERE user_id = $1 
                 AND product_id = $2 
                 AND notification_type = $3 
                 AND DATE(sent_at) = $4
                 LIMIT 1`,
                [userId, productId, notificationType, today]
            );

            return result.rows.length === 0;
        } catch (error) {
            console.error('Ошибка проверки уведомлений:', error);
            return true;
        }
    }

    async logNotification(userId, productId, notificationType, oldValue = null, newValue = null) {
        try {
            await pool.query(
                `INSERT INTO wishlist_notifications 
                 (user_id, product_id, notification_type, old_value, new_value, sent_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [userId, productId, notificationType, oldValue, newValue]
            );
        } catch (error) {
            console.error('Ошибка логирования уведомления:', error);
        }
    }

    isEmailConfigured() {
        const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
        const SMTP_PASS = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
        return !!(SMTP_USER && SMTP_PASS);
    }
}

module.exports = new WishlistNotificationService();