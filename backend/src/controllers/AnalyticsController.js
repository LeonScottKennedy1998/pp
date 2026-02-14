const pool = require('../config/database');
const { Parser } = require('json2csv');
const encryption = require('../utils/encryption');

class AnalyticsController {
async getDashboardStats(req, res) {
    try {
        const [
            usersResult,
            productsResult,
            ordersResult,
            revenueResult,
            statusStatsResult,
            popularProductsResult,
            salesTrendResult
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM users WHERE role_id = 4 AND is_active = true'),
            
            pool.query('SELECT COUNT(*) as count FROM products WHERE is_active = true'),
            pool.query('SELECT COUNT(*) as count FROM preorders'),
            pool.query('SELECT SUM(total) as revenue FROM preorders WHERE status_id != 3'),
            pool.query(`
                SELECT ps.ps_name as status, COUNT(*) as count
                FROM preorders p
                JOIN preorder_status ps ON p.status_id = ps.ps_id
                GROUP BY ps.ps_name
            `),
            pool.query(`
                SELECT 
                    pr.product_name as name,
                    COUNT(pi.product_id) as orders_count,
                    SUM(pi.quantity) as total_quantity,
                    SUM(pi.quantity * pi.price) as revenue
                FROM preorder_items pi
                JOIN products pr ON pi.product_id = pr.product_id
                GROUP BY pr.product_name
                ORDER BY total_quantity DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as orders_count,
                    SUM(total) as daily_revenue
                FROM preorders
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `)
        ]);

        const stats = {
            totalUsers: parseInt(usersResult.rows[0].count),
            totalProducts: parseInt(productsResult.rows[0].count),
            totalOrders: parseInt(ordersResult.rows[0].count),
            totalRevenue: parseFloat(revenueResult.rows[0].revenue || 0),
            orderStatuses: statusStatsResult.rows,
            popularProducts: popularProductsResult.rows,
            salesTrend: salesTrendResult.rows
        };

        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
}

    async generateReport(req, res) {
    try {
        const { startDate, endDate, format = 'json' } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Укажите начальную и конечную даты' });
        }
        
        const ordersQuery = await pool.query(`
            SELECT 
                p.pr_id as order_id,
                p.total,
                ps.ps_name as status,
                p.phone,
                p.created_at,
                p.updated_at,
                u.first_name,
                u.last_name,
                u.user_id,
                (
                    SELECT json_agg(
                        json_build_object(
                            'product_name', pr.product_name,
                            'quantity', pi.quantity,
                            'price', pi.price,
                            'total', pi.quantity * pi.price
                        )
                    )
                    FROM preorder_items pi
                    JOIN products pr ON pi.product_id = pr.product_id
                    WHERE pi.preorder_id = p.pr_id
                ) as items
            FROM preorders p
            JOIN preorder_status ps ON p.status_id = ps.ps_id
            JOIN users u ON p.user_id = u.user_id
            WHERE p.created_at BETWEEN $1 AND $2
            AND u.is_active = true
            ORDER BY p.created_at DESC
        `, [startDate, endDate]);

        const summaryQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(total) as total_revenue,
                    AVG(total) as avg_order_value,
                    COUNT(DISTINCT p.user_id) as unique_customers
                FROM preorders p
                JOIN users u ON p.user_id = u.user_id
                WHERE p.created_at BETWEEN $1 AND $2 
                AND p.status_id != 3
                AND u.is_active = true
            `, [startDate, endDate]);

        const statusStatsQuery = await pool.query(`
    WITH period_orders AS (
        SELECT *
        FROM preorders
        WHERE created_at BETWEEN $1 AND $2
    )
    SELECT
        ps.ps_name AS status,
        COUNT(*)::int AS count,
        COALESCE(SUM(p.total), 0)::float AS revenue,
        ROUND(
            COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0),
            1
        ) AS percentage
    FROM period_orders p
    JOIN preorder_status ps ON p.status_id = ps.ps_id
    GROUP BY ps.ps_name
    ORDER BY count DESC
`, [startDate, endDate]);


        const ordersWithDecryptedNames = ordersQuery.rows.map(order => {
            let customer_name = 'Пользователь';
            try {
                if (order.first_name && order.last_name) {
                    const decryptedFirstName = encryption.decryptFromDB(order.first_name);
                    const decryptedLastName = encryption.decryptFromDB(order.last_name);
                    customer_name = `${decryptedFirstName} ${decryptedLastName}`;
                }
            } catch (error) {
                console.error('Ошибка дешифрования:', error);
            }
            
            return {
                ...order,
                customer_name
            };
        });

        const report = {
            period: {
                startDate,
                endDate
            },
            summary: {
                totalOrders: parseInt(summaryQuery.rows[0].total_orders || 0),
                totalRevenue: parseFloat(summaryQuery.rows[0].total_revenue || 0),
                avgOrderValue: parseFloat(summaryQuery.rows[0].avg_order_value || 0),
                uniqueCustomers: parseInt(summaryQuery.rows[0].unique_customers || 0)
            },
            statusStats: statusStatsQuery.rows,
            orders: ordersWithDecryptedNames.map(order => {
                const { first_name, last_name, user_id, ...rest } = order;
                return rest;
            })
        };

        if (format === 'csv') {
            const flatOrders = [];
            
            ordersWithDecryptedNames.forEach(order => {
                const { first_name, last_name, user_id, items, ...orderData } = order;
                
                if (items && Array.isArray(items)) {
                    items.forEach(item => {
                        flatOrders.push({
                            order_id: orderData.order_id,
                            customer_name: orderData.customer_name,
                            status: orderData.status,
                            phone: orderData.phone,
                            created_at: orderData.created_at,
                            product_name: item.product_name,
                            quantity: item.quantity,
                            price: item.price,
                            item_total: item.total
                        });
                    });
                } else {
                    flatOrders.push({
                        order_id: orderData.order_id,
                        customer_name: orderData.customer_name,
                        status: orderData.status,
                        phone: orderData.phone,
                        created_at: orderData.created_at,
                        product_name: 'Нет данных',
                        quantity: 0,
                        price: 0,
                        item_total: 0
                    });
                }
            });

            const fields = [
                { label: 'ID заказа', value: 'order_id' },
                { label: 'Клиент', value: 'customer_name' },
                { label: 'Статус', value: 'status' },
                { label: 'Телефон', value: 'phone' },
                { label: 'Дата создания', value: 'created_at' },
                { label: 'Товар', value: 'product_name' },
                { label: 'Количество', value: 'quantity' },
                { label: 'Цена', value: 'price' },
                { label: 'Сумма', value: 'item_total' }
            ];

            const json2csvParser = new Parser({ 
                fields,
                withBOM: true,
                delimiter: ';'
            });
            
            const csv = json2csvParser.parse(flatOrders);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="report_${startDate}_to_${endDate}.csv"`);
            res.send('\ufeff' + csv);
        } else {
            res.json(report);
        }

    } catch (error) {
        console.error('Ошибка генерации отчета:', error);
        res.status(500).json({ error: 'Ошибка генерации отчета' });
    }
}

    async getChartData(req, res) {
        try {
            const salesTrend = await pool.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as orders,
                    SUM(total) as revenue
                FROM preorders
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `);

            const statusDistribution = await pool.query(`
                SELECT 
                    ps.ps_name as status,
                    COUNT(*) as count
                FROM preorders p
                JOIN preorder_status ps ON p.status_id = ps.ps_id
                GROUP BY ps.ps_name
            `);

            const topProducts = await pool.query(`
                SELECT 
                    pr.product_name as name,
                    SUM(pi.quantity) as sold_count,
                    SUM(pi.quantity * pi.price) as revenue
                FROM preorder_items pi
                JOIN products pr ON pi.product_id = pr.product_id
                GROUP BY pr.product_name
                ORDER BY sold_count DESC
                LIMIT 5
            `);

            res.json({
                salesTrend: salesTrend.rows,
                statusDistribution: statusDistribution.rows,
                topProducts: topProducts.rows
            });
        } catch (error) {
            console.error('Ошибка получения данных для графиков:', error);
            res.status(500).json({ error: 'Ошибка получения данных для графиков' });
        }
    }
}

module.exports = new AnalyticsController();