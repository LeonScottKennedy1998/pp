const pool = require('../config/database');

class WishlistController {
    async addToWishlist(req, res) {
        try {
            const userId = req.user.userId;
            const { productId } = req.body;

            if (!productId) {
                return res.status(400).json({ error: 'ID товара обязателен' });
            }

            const productResult = await pool.query(
                'SELECT product_id FROM products WHERE product_id = $1 AND is_active = true',
                [productId]
            );

            if (productResult.rows.length === 0) {
                return res.status(404).json({ error: 'Товар не найден' });
            }

            const existingItem = await pool.query(
                'SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2',
                [userId, productId]
            );

            if (existingItem.rows.length > 0) {
                return res.status(200).json({ 
                    message: 'Товар уже в избранном',
                    isInWishlist: true 
                });
            }

            const result = await pool.query(
                `INSERT INTO wishlist (user_id, product_id, added_at)
                 VALUES ($1, $2, NOW())
                 RETURNING wishlist_id, added_at`,
                [userId, productId]
            );

            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'ADD_TO_WISHLIST', 'wishlist', $2, $3)`,
                [userId, result.rows[0].wishlist_id, 
                 JSON.stringify({ product_id: productId })]
            );

            res.status(201).json({
                message: 'Товар добавлен в избранное',
                wishlistItem: result.rows[0],
                isInWishlist: true
            });

        } catch (error) {
            console.error('Ошибка добавления в избранное:', error);
            res.status(500).json({ error: 'Ошибка добавления в избранное' });
        }
    }

    async removeFromWishlist(req, res) {
        try {
            const userId = req.user.userId;
            const { productId } = req.params;

            if (!productId) {
                return res.status(400).json({ error: 'ID товара обязателен' });
            }

            const result = await pool.query(
                `DELETE FROM wishlist 
                 WHERE user_id = $1 AND product_id = $2
                 RETURNING wishlist_id`,
                [userId, productId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Товар не найден в избранном' 
                });
            }

            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id)
                 VALUES ($1, 'REMOVE_FROM_WISHLIST', 'wishlist', $2)`,
                [userId, result.rows[0].wishlist_id]
            );

            res.json({
                message: 'Товар удален из избранного',
                isInWishlist: false
            });

        } catch (error) {
            console.error('Ошибка удаления из избранного:', error);
            res.status(500).json({ error: 'Ошибка удаления из избранного' });
        }
    }

    async getUserWishlist(req, res) {
    try {
        const userId = req.user.userId;
        console.log('🔄 Запрос избранного для пользователя ID:', userId);
        
        const result = await pool.query(`
            SELECT 
                w.wishlist_id,
                w.added_at,
                p.product_id,
                p.product_name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                p.is_active,
                c.category_name,
                COALESCE(
                    (SELECT discount_percent 
                     FROM discounts d 
                     WHERE d.product_id = p.product_id 
                     AND (d.end_date IS NULL OR d.end_date > NOW())
                     ORDER BY d.created_at DESC 
                     LIMIT 1), 0
                ) as discount_percent
            FROM wishlist w
            JOIN products p ON w.product_id = p.product_id
            JOIN categories c ON p.category_id = c.category_id
            WHERE w.user_id = $1 AND p.is_active = true
            ORDER BY w.added_at DESC
        `, [userId]);
        
        console.log('✅ Найдено товаров в избранном:', result.rows.length);
        
        const wishlistItems = result.rows.map(item => {
            const price = parseFloat(item.price) || 0;
            const discountPercent = parseFloat(item.discount_percent) || 0;
            
            let finalPrice = price;
            if (discountPercent > 0 && discountPercent <= 100) {
                finalPrice = price * (1 - discountPercent / 100);
            }
            
            finalPrice = Math.round(finalPrice * 100) / 100;
            
            return {
                ...item,
                final_price: finalPrice,
                has_discount: discountPercent > 0,
                discount_percent: discountPercent
            };
        });

        res.json(wishlistItems);

    } catch (error) {
        console.error('❌ Ошибка получения избранного:', error);
        console.error('❌ Детали ошибки:', error.message);
        console.error('❌ Стек вызовов:', error.stack);
        res.status(500).json({ 
            error: 'Ошибка получения избранного',
            details: error.message 
        });
    }

}

    async checkInWishlist(req, res) {
        try {
            const userId = req.user.userId;
            const { productId } = req.params;

            const result = await pool.query(
                'SELECT wishlist_id FROM wishlist WHERE user_id = $1 AND product_id = $2',
                [userId, productId]
            );

            res.json({
                isInWishlist: result.rows.length > 0,
                wishlistId: result.rows.length > 0 ? result.rows[0].wishlist_id : null
            });

        } catch (error) {
            console.error('Ошибка проверки избранного:', error);
            res.status(500).json({ error: 'Ошибка проверки избранного' });
        }
    }

    async getWishlistCount(req, res) {
        try {
            const userId = req.user.userId;

            const result = await pool.query(
                'SELECT COUNT(*) as count FROM wishlist WHERE user_id = $1',
                [userId]
            );

            res.json({
                count: parseInt(result.rows[0].count)
            });

        } catch (error) {
            console.error('Ошибка получения количества избранного:', error);
            res.status(500).json({ error: 'Ошибка получения количества избранного' });
        }
    }
}

module.exports = new WishlistController();