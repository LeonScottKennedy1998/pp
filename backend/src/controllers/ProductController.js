const pool = require('../config/database');

class ProductController {
    async getProducts(req, res) {
    try {
        const result = await pool.query(`
            SELECT 
                p.product_id as id,
                p.product_name as name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                p.is_active,
                p.created_at,
                c.category_name as category,
                COALESCE(
                    (SELECT discount_percent 
                     FROM discounts d 
                     WHERE d.product_id = p.product_id 
                     AND (d.end_date IS NULL OR d.end_date > NOW())
                     ORDER BY d.created_at DESC 
                     LIMIT 1), 0
                ) as discount_percent,
                COALESCE(
                    (SELECT end_date 
                     FROM discounts d 
                     WHERE d.product_id = p.product_id 
                     AND (d.end_date IS NULL OR d.end_date > NOW())
                     ORDER BY d.created_at DESC 
                     LIMIT 1), NULL
                ) as discount_end_date
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.is_active = true
            ORDER BY p.created_at DESC
        `);
        
        const productsWithDiscount = result.rows.map(product => {
            const price = parseFloat(product.price) || 0;
            const discountPercent = parseFloat(product.discount_percent) || 0;
            
            let finalPrice = price;
            let hasDiscount = false;
            
            if (discountPercent > 0 && discountPercent <= 100) {
                finalPrice = price * (1 - discountPercent / 100);
                finalPrice = Math.round(finalPrice * 100) / 100;
                hasDiscount = true;
            }
            
            return {
                ...product,
                final_price: finalPrice,
                has_discount: hasDiscount,
                discount_percent: discountPercent,
                discount_end_date: product.discount_end_date,
                original_price: price
            };
        });
        
        res.json(productsWithDiscount);
    } catch (error) {
        console.error('Ошибка получения товаров:', error);
        res.status(500).json({ error: 'Ошибка получения товаров' });
    }
}

async getProductById(req, res) {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                p.product_id as id,
                p.product_name as name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                p.is_active,
                p.created_at,
                c.category_name as category,
                COALESCE(
                    (SELECT discount_percent 
                     FROM discounts d 
                     WHERE d.product_id = p.product_id 
                     AND (d.end_date IS NULL OR d.end_date > NOW())
                     ORDER BY d.created_at DESC 
                     LIMIT 1), 0
                ) as discount_percent
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.product_id = $1 AND p.is_active = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const product = result.rows[0];
        const price = parseFloat(product.price) || 0;
        const discountPercent = parseFloat(product.discount_percent) || 0;
        
        let finalPrice = price;
        let hasDiscount = false;
        
        if (discountPercent > 0 && discountPercent <= 100) {
            finalPrice = price * (1 - discountPercent / 100);
            finalPrice = Math.round(finalPrice * 100) / 100;
            hasDiscount = true;
        }
        
        const productWithDiscount = {
            ...product,
            final_price: finalPrice,
            has_discount: hasDiscount,
            discount_percent: discountPercent,
            original_price: price
        };
        
        res.json(productWithDiscount);
    } catch (error) {
        console.error('Ошибка получения товара:', error);
        res.status(500).json({ error: 'Ошибка получения товара' });
    }
}

    async getCategories(req, res) {
        try {
            const result = await pool.query('SELECT * FROM categories ORDER BY category_name');
            res.json(result.rows);
        } catch (error) {
            console.error('Ошибка получения категорий:', error);
            res.status(500).json({ error: 'Ошибка получения категорий' });
        }
    }


    async createProduct(req, res) {
    try {
        const { name, description, price, category_id, stock, image_url } = req.body;
        
        if (!name || !price || !category_id) {
            return res.status(400).json({ 
                error: 'Название, цена и категория обязательны' 
            });
        }
        
        if (price < 0) {
            return res.status(400).json({ error: 'Цена не может быть отрицательной' });
        }
        
        const initialStock = parseInt(stock) || 0;
        if (initialStock < 0) {
            return res.status(400).json({ error: 'Количество не может быть отрицательным' });
        }
        
        const result = await pool.query(
            `INSERT INTO products 
             (product_name, description, price, category_id, stock, image_url, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING product_id as id, product_name as name, description, price, 
                       stock, image_url, category_id, created_at`,
            [name, description, price, category_id, initialStock, image_url]
        );
        
        await pool.query(
            `INSERT INTO audit_log 
             (user_id, audit_action, audit_table, table_id, new_data)
             VALUES ($1, 'CREATE_PRODUCT', 'products', $2, $3)`,
            [req.user.userId, result.rows[0].id, 
             JSON.stringify({ 
                 name, 
                 price, 
                 category_id, 
                 initial_stock: initialStock 
             })]
        );
        
        res.status(201).json({
            message: `Товар успешно создан (остаток: ${initialStock})`,
            product: result.rows[0]
        });
        
    } catch (error) {
        console.error('Ошибка создания товара:', error);
        res.status(500).json({ error: 'Ошибка создания товара' });
    }
}


    async updateProduct(req, res) {
    try {
        const { id } = req.params;
        const { name, description, price, category_id, stock, image_url, is_active } = req.body;
        
        const currentProduct = await pool.query(
            'SELECT stock, product_name FROM products WHERE product_id = $1',
            [id]
        );
        
        if (currentProduct.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const currentStock = currentProduct.rows[0].stock;
        const productName = currentProduct.rows[0].product_name;
        
        let newStock = currentStock;
        if (stock !== undefined) {
            const parsedStock = parseInt(stock);
            if (isNaN(parsedStock) || parsedStock < 0) {
                return res.status(400).json({ error: 'Количество должно быть неотрицательным числом' });
            }
            newStock = parsedStock;
        }
        
        const result = await pool.query(
            `UPDATE products 
             SET product_name = COALESCE($1, product_name),
                 description = COALESCE($2, description),
                 price = COALESCE($3, price),
                 category_id = COALESCE($4, category_id),
                 stock = $5,
                 image_url = COALESCE($6, image_url),
                 is_active = COALESCE($7, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $8
             RETURNING product_id as id, product_name as name, description, price, 
                       stock, image_url, category_id, is_active, created_at, updated_at`,
            [name, description, price, category_id, newStock, image_url, is_active, id]
        );
        
        await pool.query(
            `INSERT INTO audit_log 
             (user_id, audit_action, audit_table, table_id, old_data, new_data)
             VALUES ($1, 'UPDATE_PRODUCT', 'products', $2, $3, $4)`,
            [req.user.userId, id, 
             JSON.stringify({ 
                 old_stock: currentStock,
                 product_name: productName 
             }),
             JSON.stringify({ 
                 new_stock: newStock,
                 stock_changed: newStock !== currentStock,
                 fields_updated: { name, price, category_id } 
             })]
        );
        
        res.json({
            message: 'Товар успешно обновлен',
            product: result.rows[0],
            stock_changed: newStock !== currentStock
        });
        
    } catch (error) {
        console.error('Ошибка обновления товара:', error);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
}

    async deactivateProduct(req, res) {
        try {
            const { id } = req.params;
            
            const result = await pool.query(
                `UPDATE products 
                 SET is_active = false
                 WHERE product_id = $1 AND is_active = true
                 RETURNING product_id as id, product_name as name`,
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Товар не найден или уже снят с продажи' });
            }
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'DEACTIVATE_PRODUCT', 'products', $2, $3)`,
                [req.user.userId, id, JSON.stringify({ action: 'deactivated' })]
            );
            
            res.json({
                message: 'Товар успешно снят с продажи',
                product: result.rows[0]
            });
            
        } catch (error) {
            console.error('Ошибка снятия товара с продажи:', error);
            res.status(500).json({ error: 'Ошибка снятия товара с продажи' });
        }
    }

    async activateProduct(req, res) {
        try {
            const { id } = req.params;
            
            const result = await pool.query(
                `UPDATE products 
                 SET is_active = true
                 WHERE product_id = $1 AND is_active = false
                 RETURNING product_id as id, product_name as name`,
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Товар не найден или уже активен' });
            }
            
            await pool.query(
                `INSERT INTO audit_log 
                 (user_id, audit_action, audit_table, table_id, new_data)
                 VALUES ($1, 'ACTIVATE_PRODUCT', 'products', $2, $3)`,
                [req.user.userId, id, JSON.stringify({ action: 'activated' })]
            );
            
            res.json({
                message: 'Товар успешно активирован',
                product: result.rows[0]
            });
            
        } catch (error) {
            console.error('Ошибка активации товара:', error);
            res.status(500).json({ error: 'Ошибка активации товара' });
        }
    }

    async getAllProducts(req, res) {
        try {
            const result = await pool.query(`
                SELECT 
                    p.product_id as id,
                    p.product_name as name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image_url,
                    p.is_active,
                    p.created_at,
                    c.category_name as category
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                ORDER BY p.is_active DESC, p.created_at DESC
            `);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Ошибка получения всех товаров:', error);
            res.status(500).json({ error: 'Ошибка получения товаров' });
        }
    }

    async getCategories(req, res) {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY category_name');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: 'Ошибка получения категорий' });
    }
}

async getProductsBatch(req, res) {
    try {
        const { productIds } = req.body;
        
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'Список ID товаров обязателен' });
        }
        
        if (productIds.length > 100) {
            return res.status(400).json({ error: 'Максимум 100 товаров за раз' });
        }
        
        const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
        
        const result = await pool.query(`
            SELECT 
                p.product_id as id,
                p.product_name as name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                p.is_active,
                p.created_at,
                c.category_name as category,
                COALESCE(
                    (SELECT discount_percent 
                     FROM discounts d 
                     WHERE d.product_id = p.product_id 
                     AND (d.end_date IS NULL OR d.end_date > NOW())
                     ORDER BY d.created_at DESC 
                     LIMIT 1), 0
                ) as discount_percent
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.product_id IN (${placeholders})
            AND p.is_active = true
        `, productIds);
        
        const productsWithDiscount = result.rows.map(product => {
            const price = parseFloat(product.price) || 0;
            const discountPercent = parseFloat(product.discount_percent) || 0;
            
            let finalPrice = price;
            let hasDiscount = false;
            
            if (discountPercent > 0 && discountPercent <= 100) {
                finalPrice = price * (1 - discountPercent / 100);
                finalPrice = Math.round(finalPrice * 100) / 100;
                hasDiscount = true;
            }
            
            return {
                ...product,
                final_price: finalPrice,
                has_discount: hasDiscount,
                discount_percent: discountPercent,
                original_price: price
            };
        });
        
        res.json(productsWithDiscount);
        
    } catch (error) {
        console.error('Ошибка получения товаров batch:', error);
        res.status(500).json({ error: 'Ошибка получения товаров' });
    }
}
}

module.exports = new ProductController();