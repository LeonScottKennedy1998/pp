import React, { useState, useEffect } from 'react';
import './Merchandiser.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface Order {
    id: number;
    total: number;
    status: string;
    phone: string;
    created_at: string;
    updated_at: string;
    customer_name: string;
    customer_email: string;
    items_count: number;
}

interface OrderDetails extends Order {
    items: Array<{
        id: number;
        product_id: number;
        name: string;
        description: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    customer_phone?: string;
}

const OrderManagement = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('Все');

    const statusOptions = ['Все', 'В обработке', 'Подтвержден', 'Отменен'];

    const fetchOrders = async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.ORDERS.ALL_ORDERS, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки заказов');
            
            const data = await response.json();
            setOrders(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId: number) => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.ORDERS.ADMIN_ORDER_DETAILS(orderId), {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки деталей заказа');
            
            const data = await response.json();
            setSelectedOrder(data);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const updateOrderStatus = async (orderId: number, newStatus: string) => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.ORDERS.UPDATE_STATUS(orderId), {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка обновления статуса');
            
            alert('Статус заказа обновлен!');
            fetchOrders();
            if (selectedOrder?.id === orderId) {
                setSelectedOrder({
                    ...selectedOrder,
                    status: newStatus
                });
            }
            
        } catch (err: any) {
            alert(err.message);
        }
    };

    const callCustomer = (phone: string) => {
        window.open(`tel:${phone}`, '_blank');
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = statusFilter === 'Все' 
        ? orders 
        : orders.filter(order => order.status === statusFilter);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'В обработке': return '#f39c12';
            case 'Подтвержден': return '#27ae60';
            case 'Отменен': return '#e74c3c';
            default: return '#7f8c8d';
        }
    };

    if (loading) return <div className="loading">Загрузка заказов...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="merchandiser-page">
            <div className="page-header">
                <h1>Управление заказами</h1>
                <div className="filter-controls">
                    <span>Фильтр по статусу:</span>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="status-filter"
                    >
                        {statusOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="orders-container">
                {/* Список заказов */}
                <div className="orders-list-sidebar">
                    <h3>Все заказы ({filteredOrders.length})</h3>
                    
                    {filteredOrders.map(order => (
                        <div 
                            key={order.id} 
                            className={`order-item ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                            onClick={() => fetchOrderDetails(order.id)}
                        >
                            <div className="order-item-header">
                                <span className="order-id">Заказ #{order.id}</span>
                                <span 
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(order.status) }}
                                >
                                    {order.status}
                                </span>
                            </div>
                            <div className="order-item-details">
                                <p><strong>{order.customer_name}</strong></p>
                                <p>{order.customer_email}</p>
                                <p>{order.phone}</p>
                                <p className="order-date">
                                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                </p>
                                <p className="order-total">{order.total.toLocaleString()} ₽</p>
                            </div>
                        </div>
                    ))}
                    
                    {filteredOrders.length === 0 && (
                        <div className="empty-state">
                            <p>Заказы не найдены</p>
                        </div>
                    )}
                </div>

                {/* Детали заказа */}
                <div className="order-details-panel">
                    {selectedOrder ? (
                        <>
                            <div className="order-details-header">
                                <div>
                                    <h2>Заказ #{selectedOrder.id}</h2>
                                    <p className="customer-info">
                                        {selectedOrder.customer_name} • {selectedOrder.customer_phone}
                                    </p>
                                </div>
                                
                                <div className="order-actions">
                                    <button 
                                        onClick={() => callCustomer(selectedOrder.phone)}
                                        className="call-btn"
                                    >
                                        📞 Позвонить
                                    </button>
                                    
                                    <select 
                                        value={selectedOrder.status}
                                        onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                                        className="status-select"
                                        style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                                    >
                                        <option value="В обработке">В обработке</option>
                                        <option value="Подтвержден">Подтвержден</option>
                                        <option value="Отменен">Отменен</option>
                                    </select>
                                </div>
                            </div>

                            <div className="order-info-grid">
                                <div className="info-card">
                                    <h4>Клиент</h4>
                                    <p><strong>ФИО:</strong> {selectedOrder.customer_name}</p>
                                    <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                                    <p><strong>Телефон:</strong> {selectedOrder.phone}</p>
                                </div>

                                <div className="info-card">
                                    <h4>Заказ</h4>
                                    <p><strong>ID заказа:</strong> #{selectedOrder.id}</p>
                                    <p><strong>Дата создания:</strong> {new Date(selectedOrder.created_at).toLocaleString('ru-RU')}</p>
                                    <p><strong>Обновлён:</strong> {new Date(selectedOrder.updated_at).toLocaleString('ru-RU')}</p>
                                    <p><strong>Позиций:</strong> {selectedOrder.items.length}</p>
                                </div>
                            </div>
                            <div className="info-card order-items-card">
                                <h4>Товары в заказе</h4>

                                <table className="order-items-table">
                                    <thead>
                                        <tr>
                                            <th>Товар</th>
                                            <th>Кол-во</th>
                                            <th>Цена</th>
                                            <th>Сумма</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.name}</td>
                                                <td>{item.quantity} шт.</td>
                                                <td>{item.price.toLocaleString()} ₽</td>
                                                <td>{item.total.toLocaleString()} ₽</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>Итого</td>
                                            <td>{selectedOrder.total.toLocaleString()} ₽</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Выберите заказ для просмотра деталей</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;