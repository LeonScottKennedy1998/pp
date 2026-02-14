import React, { useState, useEffect } from 'react';
import './ProcurementDashboard.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface Product {
    id: number;
    name: string;
    stock: number;
    price: number;
    category: string;
    category_name?: string;
    product_name?: string;
}

interface Recommendation extends Product {
    recommended_qty: number;
    urgency_level: 'critical' | 'high' | 'medium' | 'low';
    estimated_usage_days: number;
    avg_monthly_sales?: number;
}

const StockAnalysis = () => {
    const [stockItems, setStockItems] = useState<Product[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
    const [sortBy, setSortBy] = useState<'stock' | 'urgency' | 'sales'>('urgency');

    const fetchStockAnalysis = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Токен не найден');
            setLoading(false);
            return;
        }
        
        try {
            const productsRes = await fetch(API_URLS.PRODUCTS.BASE, {
                headers: getAuthHeaders()
            });
            
            if (!productsRes.ok) {
                throw new Error('Ошибка загрузки товаров');
            }
            
            const productsData = await productsRes.json();
            console.log('📦 Сырые данные товаров:', productsData);
            
            let products: Product[] = [];
            
            if (Array.isArray(productsData)) {
                products = productsData.map((p: any) => ({
                    id: p.id || p.product_id,
                    name: p.name || p.product_name || 'Без названия',
                    stock: p.stock || 0,
                    price: p.price || 0,
                    category: p.category || p.category_name || 'Без категории'
                }));
            } else if (productsData && Array.isArray(productsData.products)) {
                products = productsData.products.map((p: any) => ({
                    id: p.id || p.product_id,
                    name: p.name || p.product_name || 'Без названия',
                    stock: p.stock || 0,
                    price: p.price || 0,
                    category: p.category || p.category_name || 'Без категории'
                }));
            } else if (productsData && productsData.data && Array.isArray(productsData.data)) {
                products = productsData.data.map((p: any) => ({
                    id: p.id || p.product_id,
                    name: p.name || p.product_name || 'Без названия',
                    stock: p.stock || 0,
                    price: p.price || 0,
                    category: p.category || p.category_name || 'Без категории'
                }));
            } else {
                console.warn('Неожиданный формат данных товаров:', productsData);
                products = [];
            }
            
            console.log('✅ Обработанные товары:', products);
            setStockItems(products);
            
            const recommendationsList: Recommendation[] = products
                .map((product: Product) => {
                    const currentStock = product.stock || 0;
                    const price = product.price || 0;
                    
                    let urgency_level: 'critical' | 'high' | 'medium' | 'low' = 'low';
                    let recommended_qty = 0;
                    let estimatedDays = 999;
                    
                    if (currentStock === 0) {
                        urgency_level = 'critical';
                        recommended_qty = 10;
                        estimatedDays = 0;
                    }
                    else if (currentStock <= 3) {
                        urgency_level = 'critical';
                        recommended_qty = Math.max(10, 15 - currentStock);
                        estimatedDays = Math.floor(currentStock * 7);
                    }
                    else if (currentStock <= 10) {
                        urgency_level = 'high';
                        recommended_qty = Math.max(5, 20 - currentStock);
                        estimatedDays = Math.floor(currentStock * 10);
                    }
                    else if (currentStock <= 30) {
                        urgency_level = 'medium';
                        recommended_qty = Math.max(3, 40 - currentStock);
                        estimatedDays = Math.floor(currentStock * 15);
                    }
                    else {
                        urgency_level = 'low';
                        recommended_qty = 0;
                        estimatedDays = Math.floor(currentStock * 20);
                    }
                    
                    estimatedDays = Math.min(estimatedDays, 365);
                    
                    return {
                        ...product,
                        recommended_qty,
                        urgency_level,
                        estimated_usage_days: estimatedDays,
                        avg_monthly_sales: 0
                    };
                })
                .filter(r => r.recommended_qty > 0);
            
            console.log('🎯 Рекомендации:', recommendationsList);
            setRecommendations(recommendationsList);
            
        } catch (error) {
            console.error('❌ Ошибка анализа склада:', error);
            setStockItems([]);
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStockAnalysis();
    }, []);

    const getUrgencyColor = (level: string) => {
        switch (level) {
            case 'critical': return '#e74c3c';
            case 'high': return '#f39c12';
            case 'medium': return '#3498db';
            case 'low': return '#2ecc71';
            default: return '#95a5a6';
        }
    };

    const getUrgencyLabel = (level: string) => {
        switch (level) {
            case 'critical': return 'КРИТИЧЕСКИЙ';
            case 'high': return 'ВЫСОКИЙ';
            case 'medium': return 'СРЕДНИЙ';
            case 'low': return 'НИЗКИЙ';
            default: return level.toUpperCase();
        }
    };

    const getUrgencyDescription = (level: string, days: number) => {
        switch (level) {
            case 'critical': 
                return days === 0 ? 'Нет в наличии' : `Заканчивается через ${days} дней`;
            case 'high': return `Закончится через ${days} дней`;
            case 'medium': return `Достаточно на ${days} дней`;
            case 'low': return `Достаточно на ${days} дней`;
            default: return '';
        }
    };

    const handleQuickOrder = (product: Recommendation) => {
    console.log('🚚 Быстрый заказ для:', product);
    
    localStorage.setItem('quickOrderData', JSON.stringify({
        product_id: product.id,
        product_name: product.name,
        recommended_qty: product.recommended_qty,
        price: product.price,
        category: product.category
    }));
    
    alert(`Товар "${product.name}" подготовлен для заказа. Перейдите на вкладку "Управление заявками" для завершения.`);
    
};

    const filteredRecommendations = recommendations
        .filter(rec => filter === 'all' || rec.urgency_level === filter)
        .sort((a, b) => {
            switch (sortBy) {
                case 'stock':
                    return a.stock - b.stock;
                case 'sales':
                    return (b.avg_monthly_sales || 0) - (a.avg_monthly_sales || 0);
                case 'urgency':
                default:
                    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level];
            }
        });

    const summary = {
        critical: recommendations.filter(r => r.urgency_level === 'critical').length,
        high: recommendations.filter(r => r.urgency_level === 'high').length,
        medium: recommendations.filter(r => r.urgency_level === 'medium').length,
        low: recommendations.filter(r => r.urgency_level === 'low').length,
        total: recommendations.length
    };

    if (loading) return <div className="loading">Анализ склада...</div>;

    return (
        <div className="stock-analysis">
            <div className="section-header">
                <h2>📊 Анализ остатков на складе</h2>
                <p>Рекомендации по закупке на основе текущих остатков</p>
            </div>

            <div className="analytics-summary">
                <div className="summary-cards">
                    <div className="summary-card critical" onClick={() => setFilter('critical')}>
                        <div className="summary-icon">🔥</div>
                        <div className="summary-content">
                            <h3>{summary.critical}</h3>
                            <p>Критических</p>
                            <small>Меньше недели осталось</small>
                        </div>
                    </div>
                    
                    <div className="summary-card high" onClick={() => setFilter('high')}>
                        <div className="summary-icon">⚠️</div>
                        <div className="summary-content">
                            <h3>{summary.high}</h3>
                            <p>Высокий приоритет</p>
                            <small>1-2 недели осталось</small>
                        </div>
                    </div>
                    
                    <div className="summary-card medium" onClick={() => setFilter('medium')}>
                        <div className="summary-icon">📦</div>
                        <div className="summary-content">
                            <h3>{summary.medium}</h3>
                            <p>Средний приоритет</p>
                            <small>2-4 недели осталось</small>
                        </div>
                    </div>
                    
                    <div className="summary-card total" onClick={() => setFilter('all')}>
                        <div className="summary-icon">📋</div>
                        <div className="summary-content">
                            <h3>{summary.total}</h3>
                            <p>Всего рекомендаций</p>
                            <small>Требуют закупки</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="controls-row">
                <div className="filter-controls">
                    <button 
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Все ({summary.total})
                    </button>
                    <button 
                        className={`filter-btn critical ${filter === 'critical' ? 'active' : ''}`}
                        onClick={() => setFilter('critical')}
                    >
                        Критические ({summary.critical})
                    </button>
                    <button 
                        className={`filter-btn high ${filter === 'high' ? 'active' : ''}`}
                        onClick={() => setFilter('high')}
                    >
                        Высокие ({summary.high})
                    </button>
                    <button 
                        className={`filter-btn medium ${filter === 'medium' ? 'active' : ''}`}
                        onClick={() => setFilter('medium')}
                    >
                        Средние ({summary.medium})
                    </button>
                </div>
                
                <div className="sort-controls">
                    <span>Сортировка:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="sort-select"
                    >
                        <option value="urgency">По приоритету</option>
                        <option value="stock">По остатку</option>
                        <option value="sales">По популярности</option>
                    </select>
                </div>
            </div>

            <div className="recommendations-list">
                {filteredRecommendations.length > 0 ? (
                    <table className="procurement-table">
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Категория</th>
                                <th>Текущий остаток</th>
                                <th>Приоритет</th>
                                <th>Осталось дней</th>
                                <th>Рекомендуется</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecommendations.map((rec, index) => (
                                <tr key={`${rec.id}-${index}`}>
                                    <td>
                                        <div className="product-info">
                                            <strong>{rec.name}</strong>
                                            <small>Цена: {rec.price.toLocaleString()} ₽</small>
                                        </div>
                                    </td>
                                    <td>{rec.category}</td>
                                    <td>
                                        <span className={`stock-indicator ${rec.urgency_level}`}>
                                            {rec.stock} шт.
                                        </span>
                                    </td>
                                    <td>
                                        <span 
                                            className="urgency-badge"
                                            style={{ backgroundColor: getUrgencyColor(rec.urgency_level) }}
                                        >
                                            {getUrgencyLabel(rec.urgency_level)}
                                        </span>
                                        <div className="urgency-description">
                                            {getUrgencyDescription(rec.urgency_level, rec.estimated_usage_days)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="days-indicator">
                                            <div 
                                                className="days-bar"
                                                style={{ 
                                                    width: `${Math.min(100, (rec.estimated_usage_days / 30) * 100)}%`,
                                                    backgroundColor: getUrgencyColor(rec.urgency_level)
                                                }}
                                            ></div>
                                            <span className="days-text">{rec.estimated_usage_days} дн.</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="recommendation-info">
                                            <span className="recommended-qty">{rec.recommended_qty} шт.</span>
                                            <div className="recommended-total">
                                                ≈ {(rec.recommended_qty * rec.price).toLocaleString()} ₽
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                onClick={() => handleQuickOrder(rec)}
                                                className="quick-order-btn"
                                                title="Быстрая закупка"
                                            >
                                                🚚 Заказать
                                            </button>
                                            
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        {recommendations.length === 0 ? (
                            <>
                                <p>🎉 Отличные новости! Все товары в достаточном количестве.</p>
                                <p><small>Рекомендации по закупке появятся при низких остатках.</small></p>
                            </>
                        ) : (
                            <>
                                <p>Нет рекомендаций для выбранного фильтра</p>
                                <button 
                                    onClick={() => setFilter('all')}
                                    className="secondary-btn"
                                >
                                    Показать все рекомендации ({recommendations.length})
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="summary-section">
                <h3>📈 Статистика по складу</h3>
                <div className="stats-grid">
                    <div className="stat-item">
                        <div className="stat-value">{stockItems.length}</div>
                        <div className="stat-label">Всего товаров</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {stockItems.filter(p => p.stock < 10).length}
                        </div>
                        <div className="stat-label">Товаров меньше 10 шт.</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {stockItems.filter(p => p.stock === 0).length}
                        </div>
                        <div className="stat-label">Товаров нет в наличии</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {stockItems.length > 0 
                                ? Math.round(stockItems.reduce((sum, p) => sum + (p.stock || 0), 0) / stockItems.length)
                                : 0}
                        </div>
                        <div className="stat-label">Средний остаток</div>
                    </div>
                </div>
            </div>

            <div className="tips-section">
                <h3>💡 Советы по закупкам</h3>
                <div className="tips-list">
                    <div className="tip-item">
                        <span className="tip-icon">🔥</span>
                        <div className="tip-content">
                            <strong>Критические товары</strong>
                            <p>Закупите в первую очередь. Меньше недели осталось до полного истощения.</p>
                        </div>
                    </div>
                    <div className="tip-item">
                        <span className="tip-icon">⚠️</span>
                        <div className="tip-content">
                            <strong>Высокий приоритет</strong>
                            <p>Запланируйте закупку на ближайшую неделю. Риск остаться без товара.</p>
                        </div>
                    </div>
                    <div className="tip-item">
                        <span className="tip-icon">📦</span>
                        <div className="tip-content">
                            <strong>Средний приоритет</strong>
                            <p>Добавьте в плановую закупку. Время заказать пока есть запас.</p>
                        </div>
                    </div>
                    <div className="tip-item">
                        <span className="tip-icon">✅</span>
                        <div className="tip-content">
                            <strong>Низкий приоритет</strong>
                            <p>Остаток достаточный. Можно отложить до следующей плановой закупки.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockAnalysis;