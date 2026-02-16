import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Order } from '../../types/product';
import { API_URLS, getAuthHeaders } from '../../config/api';
import './OrdersPage.css';

const OrdersPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        const token = localStorage.getItem('token');
        
        if (!token) {
            setError('Требуется авторизация');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(API_URLS.ORDERS.MY_ORDERS, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки заказов');
            }

            const data = await response.json();
            setOrders(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'В обработке': return '#f39c12';
            case 'Подтвержден': return '#27ae60';
            case 'Отменен': return '#e74c3c';
            default: return '#7f8c8d';
        }
    };

    if (loading) {
        return (
            <div className="orders-page">
                <div className="page">
                    <h1>Мои заказы</h1>
                    <div className="loading">Загрузка заказов...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="orders-page">
                <div className="page">
                    <h1>Мои заказы</h1>
                    <div className="error-message">{error}</div>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="orders-page">
                <div className="page">
                    <h1>Мои заказы</h1>
                    <div className="empty-orders">
                        <p>У вас пока нет заказов</p>
                        <Link to="/catalog">
                            <button className="cta-button">Перейти к каталогу</button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-page">
            <div className="page">
                <h1>Мои заказы</h1>
                
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order.id} className="order-card">
                            <div className="order-header">
                                <div>
                                    <h3>Заказ #{order.id}</h3>
                                    <p className="order-date">
                                        {new Date(order.created_at).toLocaleDateString('ru-RU', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div className="order-status">
                                    <span 
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(order.status) }}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="order-items">
                                <h4>Состав заказа:</h4>
                                <div className="table-wrapper">
                                    <table className="order-items-table">
                                        <thead>
                                            <tr>
                                                <th>Товар</th>
                                                <th>Количество</th>
                                                <th>Цена</th>
                                                <th>Сумма</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items && order.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td data-label="Товар">{item.product_name}</td>
                                                    <td data-label="Количество">{item.quantity} шт.</td>
                                                    <td data-label="Цена">{item.price.toLocaleString()} ₽</td>
                                                    <td data-label="Сумма">{item.total.toLocaleString()} ₽</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="order-footer">
                                <div className="order-total">
                                    <strong>Итого:</strong>
                                    <span className="total-amount">{order.total.toLocaleString()} ₽</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;