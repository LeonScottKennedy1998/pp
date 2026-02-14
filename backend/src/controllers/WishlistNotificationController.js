const pool = require('../config/database');
const WishlistNotificationService = require('../services/wishlistNotificationService');

class WishlistNotificationController {
    
    async checkAndNotifyStockAvailable() {
        try {
            console.log('🔍 Проверка товаров, которые появились в наличии...');
            
            const result = await pool.query(`
                SELECT 
                    w.user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    w.product_id,
                    p.product_name,
                    p.price,
                    p.stock,
                    c.category_name,
                    COALESCE(
                        (SELECT discount_percent 
                         FROM discounts d 
                         WHERE d.product_id = p.product_id 
                         AND (d.end_date IS NULL OR d.end_date > NOW())
                         LIMIT 1), 0
                    ) as discount_percent
                FROM wishlist w
                JOIN users u ON w.user_id = u.user_id
                JOIN products p ON w.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                WHERE p.stock > 0 
                AND p.is_active = true
                AND EXISTS (
                    SELECT 1 FROM products p2 
                    WHERE p2.product_id = p.product_id 
                    AND p2.updated_at > NOW() - INTERVAL '24 hours' -- Изменен за последние 24 часа
                )
                ORDER BY w.user_id, w.product_id
            `);

            console.log(`📨 Найдено ${result.rows.length} товаров для уведомления о наличии`);

            let sentCount = 0;
            for (const item of result.rows) {
                try {
                    const shouldSend = await WishlistNotificationService.shouldSendNotification(
                        item.user_id, 
                        item.product_id, 
                        'stock_available'
                    );

                    if (shouldSend) {
                        let userName = `${item.first_name} ${item.last_name}`;
                        if (item.first_name && item.first_name.includes('{"iv":')) {
                            const encryption = require('../utils/encryption');
                            try {
                                const decryptedFirstName = encryption.decryptFromDB(item.first_name);
                                const decryptedLastName = encryption.decryptFromDB(item.last_name);
                                userName = `${decryptedFirstName} ${decryptedLastName}`;
                            } catch (e) {
                                console.error('Ошибка дешифрования:', e);
                            }
                        }

                        const productData = {
                            product_name: item.product_name,
                            category_name: item.category_name,
                            price: parseFloat(item.price),
                            stock: item.stock,
                            has_discount: item.discount_percent > 0,
                            discount_percent: parseFloat(item.discount_percent),
                            final_price: item.discount_percent > 0 
                                ? item.price * (1 - item.discount_percent / 100)
                                : item.price
                        };

                        const sent = await WishlistNotificationService.sendStockAvailableNotification(
                            item.email,
                            productData,
                            userName
                        );

                        if (sent) {
                            await WishlistNotificationService.logNotification(
                                item.user_id,
                                item.product_id,
                                'stock_available',
                                '0',
                                item.stock.toString()
                            );
                            sentCount++;
                        }
                    }
                } catch (error) {
                    console.error(`❌ Ошибка отправки уведомления для пользователя ${item.user_id}:`, error);
                }
            }

            console.log(`✅ Отправлено ${sentCount} уведомлений о наличии товаров`);
            return { processed: result.rows.length, sent: sentCount };

        } catch (error) {
            console.error('❌ Ошибка проверки уведомлений о наличии:', error);
            throw error;
        }
    }

    async checkAndNotifyDiscounts() {
        try {
            console.log('🔍 Проверка новых скидок на товары из избранного...');
            
            const result = await pool.query(`
                SELECT 
                    w.user_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    w.product_id,
                    p.product_name,
                    p.price as old_price,
                    c.category_name,
                    d.discount_percent,
                    d.created_at as discount_created_at,
                    p.stock
                FROM wishlist w
                JOIN users u ON w.user_id = u.user_id
                JOIN products p ON w.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN discounts d ON p.product_id = d.product_id
                WHERE p.is_active = true
                AND d.created_at > NOW() - INTERVAL '24 hours' -- Скидка создана за последние 24 часа
                AND (d.end_date IS NULL OR d.end_date > NOW()) -- Активная скидка
                ORDER BY w.user_id, w.product_id
            `);

            console.log(`📨 Найдено ${result.rows.length} товаров со скидками для уведомления`);

            let sentCount = 0;
            for (const item of result.rows) {
                try {
                    const shouldSend = await WishlistNotificationService.shouldSendNotification(
                        item.user_id, 
                        item.product_id, 
                        'discount'
                    );

                    if (shouldSend) {
                        let userName = `${item.first_name} ${item.last_name}`;
                        if (item.first_name && item.first_name.includes('{"iv":')) {
                            const encryption = require('../utils/encryption');
                            try {
                                const decryptedFirstName = encryption.decryptFromDB(item.first_name);
                                const decryptedLastName = encryption.decryptFromDB(item.last_name);
                                userName = `${decryptedFirstName} ${decryptedLastName}`;
                            } catch (e) {
                                console.error('Ошибка дешифрования:', e);
                            }
                        }

                        const newPrice = item.old_price * (1 - item.discount_percent / 100);
                        
                        const productData = {
                            product_name: item.product_name,
                            category_name: item.category_name,
                            stock: item.stock
                        };

                        const sent = await WishlistNotificationService.sendDiscountNotification(
                            item.email,
                            productData,
                            userName,
                            parseFloat(item.old_price),
                            newPrice,
                            item.discount_percent
                        );

                        if (sent) {
                            await WishlistNotificationService.logNotification(
                                item.user_id,
                                item.product_id,
                                'discount',
                                item.old_price.toString(),
                                newPrice.toString()
                            );
                            sentCount++;
                        }
                    }
                } catch (error) {
                    console.error(`❌ Ошибка отправки уведомления о скидке для пользователя ${item.user_id}:`, error);
                }
            }

            console.log(`✅ Отправлено ${sentCount} уведомлений о скидках`);
            return { processed: result.rows.length, sent: sentCount };

        } catch (error) {
            console.error('❌ Ошибка проверки уведомлений о скидках:', error);
            throw error;
        }
    }

    async manualCheck(req, res) {
        try {
            console.log('🚀 Ручной запуск проверки уведомлений...');
            
            const [stockResult, discountResult] = await Promise.all([
                this.checkAndNotifyStockAvailable(),
                this.checkAndNotifyDiscounts()
            ]);

            res.json({
                message: 'Проверка уведомлений завершена',
                stock_notifications: stockResult,
                discount_notifications: discountResult,
                total_sent: stockResult.sent + discountResult.sent
            });

        } catch (error) {
            console.error('❌ Ошибка ручной проверки уведомлений:', error);
            res.status(500).json({ error: 'Ошибка проверки уведомлений' });
        }
    }

    async getNotificationStats(req, res) {
        try {
            const statsResult = await pool.query(`
                SELECT 
                    notification_type,
                    COUNT(*) as total_sent,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT product_id) as unique_products,
                    MAX(sent_at) as last_sent
                FROM wishlist_notifications
                GROUP BY notification_type
                ORDER BY total_sent DESC
            `);

            const recentNotifications = await pool.query(`
                SELECT 
                    wn.*,
                    u.email,
                    p.product_name
                FROM wishlist_notifications wn
                JOIN users u ON wn.user_id = u.user_id
                JOIN products p ON wn.product_id = p.product_id
                ORDER BY wn.sent_at DESC
                LIMIT 10
            `);

            res.json({
                stats: statsResult.rows,
                recent_notifications: recentNotifications.rows
            });

        } catch (error) {
            console.error('❌ Ошибка получения статистики уведомлений:', error);
            res.status(500).json({ error: 'Ошибка получения статистики' });
        }
    }
}

module.exports = new WishlistNotificationController();