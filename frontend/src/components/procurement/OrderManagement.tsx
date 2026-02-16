import React, { useState, useEffect } from 'react';
import './ProcurementDashboard.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface PurchaseOrder {
    po_id: number;
    supplier_id: number;
    supplier_name: string;
    contact_person: string;
    supplier_phone: string;
    delivery_status_id: number;
    status_name: string;
    total_amount: number;
    created_at: string;
    updated_at: string;
    items_count: number;
}

interface DeliveryStatus {
    status_id: number;
    status_name: string;
}

interface Supplier {
    supplier_id: number;
    name: string;
    is_active?: boolean;
}

interface Product {
    id: number;
    name: string;
    stock: number;
    price: number;
    category: string;
}


const OrderManagement = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [statuses, setStatuses] = useState<DeliveryStatus[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [orderDetails, setOrderDetails] = useState<any>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState({
        orders: true,
        products: true,
        data: true
    });
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
    
    const [newOrder, setNewOrder] = useState({
        supplier_id: '',
        items: [] as Array<{ product_id: number; quantity: number; unit_price: number; name: string }>
    });

    const [newItem, setNewItem] = useState({
        product_id: '',
        quantity: 1,
        unit_price: 0
    });

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Токен не найден');
            setLoading(prev => ({ ...prev, orders: false, data: false }));
            return;
        }
        
        try {
            const [ordersRes, statusesRes, suppliersRes] = await Promise.all([
                fetch(API_URLS.PROCUREMENT.ORDERS, {
                    headers: getAuthHeaders()
                }),
                fetch(API_URLS.PROCUREMENT.DELIVERY_STATUSES, {
                    headers: getAuthHeaders()
                }),
                fetch(API_URLS.PROCUREMENT.SUPPLIERS, {
                    headers: getAuthHeaders()
                })
            ]);
            
            if (!ordersRes.ok || !statusesRes.ok || !suppliersRes.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const ordersData = await ordersRes.json();
            const statusesData = await statusesRes.json();
            const suppliersData = await suppliersRes.json();
            
            setOrders(Array.isArray(ordersData) ? ordersData : []);
            setStatuses(Array.isArray(statusesData) ? statusesData : []);
            setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
            
            setLoading(prev => ({ ...prev, orders: false }));
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            setOrders([]);
            setStatuses([]);
            setSuppliers([]);
            setLoading(prev => ({ ...prev, orders: false }));
        }
    };

    const fetchProducts = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Токен не найден');
            setLoading(prev => ({ ...prev, products: false, data: false }));
            return;
        }
        
        try {
            const response = await fetch(API_URLS.PRODUCTS.BASE, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Ответ от API продуктов:', data);
            
            if (Array.isArray(data)) {
                setProducts(data);
            } else if (data && Array.isArray(data.products)) {
                setProducts(data.products);
            } else if (data && data.data && Array.isArray(data.data)) {
                setProducts(data.data);
            } else {
                console.warn('Неожиданный формат данных товаров:', data);
                setProducts([]);
            }
            
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            setProducts([]);
        } finally {
            setLoading(prev => ({ ...prev, products: false }));
        }
    };

    useEffect(() => {
        fetchData();
        fetchProducts();
    }, []);

    useEffect(() => {
        if (!loading.orders && !loading.products) {
            setLoading(prev => ({ ...prev, data: false }));
        }
    }, [loading.orders, loading.products]);

    
    const fetchOrderDetails = async (poId: number) => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Токен не найден');
            return;
        }
        
        try {
            const response = await fetch(API_URLS.PROCUREMENT.ORDER_BY_ID(poId), {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setOrderDetails(data);
        } catch (error) {
            console.error('Ошибка загрузки деталей:', error);
            setOrderDetails(null);
        }
    };

    const handleSelectOrder = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        fetchOrderDetails(order.po_id);
    };

    const handleUpdateStatus = async (poId: number, statusId: number) => {
        if (updatingStatus === poId) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Токен не найден. Пожалуйста, войдите в систему.');
            return;
        }
        
        setUpdatingStatus(poId);
        
        try {
            const response = await fetch(API_URLS.PROCUREMENT.UPDATE_ORDER_STATUS(poId), {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ delivery_status_id: statusId })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка обновления статуса');
            }
            
            const result = await response.json();
            
            setOrders(prevOrders => 
                prevOrders.map(order => 
                    order.po_id === poId 
                        ? { 
                            ...order, 
                            delivery_status_id: statusId,
                            status_name: statuses.find(s => s.status_id === statusId)?.status_name || order.status_name 
                        } 
                        : order
                )
            );
            
            if (selectedOrder?.po_id === poId) {
                setSelectedOrder(prev => prev ? {
                    ...prev,
                    delivery_status_id: statusId,
                    status_name: statuses.find(s => s.status_id === statusId)?.status_name || prev.status_name
                } : null);
                
                setOrderDetails((prev: any) => prev ? {
                    ...prev,
                    order: {
                        ...prev.order,
                        delivery_status_id: statusId,
                        status_name: statuses.find(s => s.status_id === statusId)?.status_name || prev.order.status_name
                    }
                } : null);
            }
            
            alert(result.message || 'Статус обновлен');
            
        } catch (error: any) {
            console.error('Ошибка обновления статуса:', error);
            alert(error.message || 'Ошибка обновления статуса');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const applyQuickOrder = () => {
    const quickOrderData = localStorage.getItem('quickOrderData');
    if (!quickOrderData) {
        alert('Нет товара для быстрого заказа');
        return;
    }
    
    try {
        const data = JSON.parse(quickOrderData);
        const product = products.find(p => p.id === data.product_id);
        if (product) {
            setNewOrder({
                supplier_id: '',
                items: [{
                    product_id: data.product_id,
                    quantity: data.recommended_qty || 1,
                    unit_price: data.price || product.price,
                    name: data.product_name || product.name
                }]
            });
            
            setShowCreateForm(true);
            
            localStorage.removeItem('quickOrderData');
            
            alert(`✅ Товар "${data.product_name}" добавлен в заявку!\n\nКоличество: ${data.recommended_qty || 1} шт.\nТеперь выберите поставщика.`);
        } else {
            alert('Товар не найден в базе данных');
            localStorage.removeItem('quickOrderData');
        }
    } catch (error) {
        console.error('Ошибка загрузки быстрого заказа:', error);
        alert('Ошибка загрузки быстрого заказа');
        localStorage.removeItem('quickOrderData');
    }
};

    const handleAddItem = () => {
        if (!Array.isArray(products) || products.length === 0) {
            alert('Список товаров не загружен');
            return;
        }
        
        const productId = parseInt(newItem.product_id);
        if (isNaN(productId)) {
            alert('Выберите товар');
            return;
        }
        
        const product = products.find(p => p.id === productId);
        if (!product) {
            alert('Товар не найден');
            return;
        }
        
        setNewOrder({
            ...newOrder,
            items: [
                ...newOrder.items,
                {
                    product_id: productId,
                    quantity: newItem.quantity,
                    unit_price: newItem.unit_price || product.price,
                    name: product.name
                }
            ]
        });
        
        setNewItem({
            product_id: '',
            quantity: 1,
            unit_price: 0
        });
    };

    const handleRemoveItem = (index: number) => {
    const itemName = newOrder.items[index].name;
    
    if (window.confirm(`Удалить товар "${itemName}" из заявки?`)) {
        setNewOrder({
            ...newOrder,
            items: newOrder.items.filter((_, i) => i !== index)
        });
    }
};

    const handleCreateOrder = async () => {
        if (!newOrder.supplier_id || newOrder.items.length === 0) {
            alert('Выберите поставщика и добавьте товары');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Токен не найден. Пожалуйста, войдите в систему.');
            return;
        }
        
        try {
            const response = await fetch(API_URLS.PROCUREMENT.ORDERS, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    supplier_id: parseInt(newOrder.supplier_id),
                    items: newOrder.items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    }))
                })
            });
            
            if (response.ok) {
                alert('Заявка создана успешно!');
                setShowCreateForm(false);
                setNewOrder({
                    supplier_id: '',
                    items: []
                });
                fetchData();
            } else {
                const error = await response.json();
                alert(error.error || 'Ошибка создания заявки');
            }
        } catch (error) {
            alert('Ошибка создания заявки');
        }
    };

    const getStatusColor = (statusId: number) => {
        const colors: {[key: number]: string} = {
            1: '#f39c12',
            2: '#3498db',
            3: '#9b59b6',
            4: '#2ecc71',
            5: '#e74c3c'
        };
        return colors[statusId] || '#95a5a6';
    };

    const getStatusName = (statusId: number) => {
        const status = statuses.find(s => s.status_id === statusId);
        return status ? status.status_name : 'Неизвестно';
    };

    const activeSuppliers = Array.isArray(suppliers) 
        ? suppliers.filter(s => s.is_active !== false)
        : [];

    if (loading.data) return <div className="loading">Загрузка данных...</div>;

    return (
        <div className="order-management">
            <div className="section-header">
                <h2>Управление заявками на закупку</h2>
                <div className="header-actions">
                    <button onClick={() => setShowCreateForm(true)} className="cta-button">
                        <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>+</span>
                        Создать заявку
                    </button>
                    
                    <button 
                        onClick={applyQuickOrder}
                        className="secondary-btn"
                        title="Добавить товар из быстрого заказа"
                        disabled={!localStorage.getItem('quickOrderData')}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🚚</span>
                        Быстрый заказ
                    </button>
                </div>
            </div>

            <div className="orders-container">
                <div className="orders-sidebar">
                    <h3>История заявок</h3>
                    <div className="orders-list">
                        {Array.isArray(orders) && orders.length > 0 ? (
                            orders.map(order => (
                                <div 
                                    key={order.po_id}
                                    className={`order-item ${selectedOrder?.po_id === order.po_id ? 'selected' : ''}`}
                                    onClick={() => handleSelectOrder(order)}
                                >
                                    <div className="order-item-header">
                                        <span className="order-id">Заявка #{order.po_id}</span>
                                        <span 
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(order.delivery_status_id) }}
                                        >
                                            {order.status_name}
                                        </span>
                                    </div>
                                    <div className="order-item-details">
                                        <p><strong>Поставщик:</strong> {order.supplier_name}</p>
                                        <p><strong>Сумма:</strong> {order.total_amount?.toLocaleString()} ₽</p>
                                        <p><strong>Товаров:</strong> {order.items_count}</p>
                                        <p className="order-date">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <p>Заявок не найдено</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="order-details-panel">
                    {selectedOrder ? (
                        <>
                            <div className="order-details-header">
                                <div>
                                    <h2>Заявка #{selectedOrder.po_id}</h2>
                                    <p className="customer-info">
                                        Поставщик: {selectedOrder.supplier_name}
                                    </p>
                                    <p>Дата создания: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                                <div className="order-actions">
                                    <select 
                                        value={selectedOrder.delivery_status_id}
                                        onChange={(e) => handleUpdateStatus(selectedOrder.po_id, parseInt(e.target.value))}
                                        className="status-select"
                                        style={{ backgroundColor: getStatusColor(selectedOrder.delivery_status_id) }}
                                        disabled={updatingStatus === selectedOrder.po_id}
                                    >
                                        {Array.isArray(statuses) && statuses.map(status => (
                                            <option key={status.status_id} value={status.status_id}>
                                                {status.status_name}
                                            </option>
                                        ))}
                                    </select>
                                    {updatingStatus === selectedOrder.po_id && (
                                        <span className="updating-indicator">🔄</span>
                                    )}
                                    <button 
                                        className="call-btn" 
                                        onClick={() => window.open(`tel:${selectedOrder.supplier_phone}`)}
                                    >
                                        📞 {selectedOrder.supplier_phone}
                                    </button>
                                </div>
                            </div>

                            {orderDetails ? (
                                <>
                                    <div className="order-info-grid">
                                        <div className="info-card">
                                            <h4>Информация о поставщике</h4>
                                            <p><strong>Компания:</strong> {orderDetails.order?.supplier_name || selectedOrder.supplier_name}</p>
                                            <p><strong>Контактное лицо:</strong> {orderDetails.order?.contact_person || selectedOrder.contact_person}</p>
                                            <p><strong>Email:</strong> {orderDetails.order?.supplier_email || 'Нет данных'}</p>
                                            <p><strong>Телефон:</strong> {orderDetails.order?.supplier_phone || selectedOrder.supplier_phone}</p>
                                            <p><strong>Менеджер:</strong> {orderDetails.order?.manager_name || 'Нет данных'}</p>
                                        </div>

                                        <div className="info-card">
                                            <h4>Детали заявки</h4>
                                            <p><strong>Общая сумма:</strong> {orderDetails.order?.total_amount?.toLocaleString() || selectedOrder.total_amount?.toLocaleString()} ₽</p>
                                            <p><strong>Статус:</strong> 
                                                <span 
                                                    className="status-badge-inline"
                                                    style={{ 
                                                        backgroundColor: getStatusColor(selectedOrder.delivery_status_id),
                                                        marginLeft: '8px'
                                                    }}
                                                >
                                                    {getStatusName(selectedOrder.delivery_status_id)}
                                                </span>
                                            </p>
                                            <p><strong>Создана:</strong> {new Date(orderDetails.order?.created_at || selectedOrder.created_at).toLocaleString()}</p>
                                            <p><strong>Обновлена:</strong> {new Date(orderDetails.order?.updated_at || selectedOrder.updated_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="order-items-card">
                                        <h4>Товары в заявке ({orderDetails.items?.length || selectedOrder.items_count || 0})</h4>
                                        {orderDetails.items && Array.isArray(orderDetails.items) ? (
                                            <table className="order-items-table">
                                                <thead>
                                                    <tr>
                                                        <th>Товар</th>
                                                        <th>Категория</th>
                                                        <th>Количество</th>
                                                        <th>Цена за единицу</th>
                                                        <th>Сумма</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {orderDetails.items.map((item: any, index: number) => (
                                                        <tr key={index}>
                                                            <td>{item.product_name}</td>
                                                            <td>{item.category_name}</td>
                                                            <td>{item.quantity} шт.</td>
                                                            <td>{item.unit_price} ₽</td>
                                                            <td>{(item.quantity * item.unit_price).toLocaleString()} ₽</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td colSpan={4}><strong>Итого:</strong></td>
                                                        <td><strong>{orderDetails.order?.total_amount?.toLocaleString() || selectedOrder.total_amount?.toLocaleString()} ₽</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        ) : (
                                            <p>Загрузка товаров...</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="loading-details">
                                    <p>Загрузка деталей заявки...</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Выберите заявку для просмотра деталей</p>
                        </div>
                    )}
                </div>
            </div>

            {showCreateForm && (
                <div className="modal-overlay">
                    <div className="modal wide-modal">
                        <h2>Создание заявки на закупку</h2>
                        
                        <div className="form-group">
                            <label>Поставщик *</label>
                            <select
                                value={newOrder.supplier_id}
                                onChange={(e) => setNewOrder({...newOrder, supplier_id: e.target.value})}
                                required
                            >
                                <option value="">Выберите поставщика</option>
                                {activeSuppliers.map(supplier => (
                                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="add-item-form">
                            <h4>Добавить товары</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Товар</label>
                                    <select
                                        value={newItem.product_id}
                                        onChange={(e) => {
                                            const productId = e.target.value;
                                            const product = Array.isArray(products) 
                                                ? products.find(p => p.id === parseInt(productId))
                                                : undefined;
                                            setNewItem({
                                                ...newItem,
                                                product_id: productId,
                                                unit_price: product ? product.price : 0
                                            });
                                        }}
                                    >
                                        <option value="">Выберите товар</option>
                                        {Array.isArray(products) && products.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (остаток: {product.stock} шт.)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Количество</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Цена за единицу</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newItem.unit_price}
                                        onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <button 
                                        type="button" 
                                        onClick={handleAddItem}
                                        className="add-btn"
                                        disabled={!newItem.product_id}
                                    >
                                        Добавить
                                    </button>
                                </div>
                            </div>
                        </div>

                        {newOrder.items.length > 0 && (
                            <div className="items-list">
                                <h4>Товары в заявке ({newOrder.items.length})</h4>
                                <div className="table-responsive">
                                    <table className="items-table">
                                        <thead>
                                            <tr>
                                                <th>Товар</th>
                                                <th>Количество</th>
                                                <th>Цена за единицу</th>
                                                <th>Сумма</th>
                                                <th style={{ width: '60px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newOrder.items.map((item, index) => {
                                                const unitPrice = typeof item.unit_price === 'number' 
                                                    ? item.unit_price 
                                                    : parseFloat(item.unit_price || 0);
                                                const itemTotal = item.quantity * unitPrice;
                                                
                                                return (
                                                    <tr key={index}>
                                                        <td>
                                                            <div style={{ fontWeight: '600' }}>{item.name}</div>
                                                            <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                                                                ID: {item.product_id}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>{item.quantity} шт.</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {unitPrice.toFixed(2)} ₽
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                                            {itemTotal.toLocaleString('ru-RU', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })} ₽
                                                        </td>
                                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                                            <button 
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="remove-icon-btn"
                                                                title="Удалить товар"
                                                                aria-label="Удалить товар"
                                                            >
                                                                <span className="remove-icon">×</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3} style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                                    <strong>Общая сумма:</strong>
                                                </td>
                                                <td colSpan={2} style={{ textAlign: 'right' }}>
                                                    <strong style={{ fontSize: '1.2rem', color: '#27ae60' }}>
                                                        {newOrder.items
                                                            .reduce((sum, item) => {
                                                                const unitPrice = typeof item.unit_price === 'number' 
                                                                    ? item.unit_price 
                                                                    : parseFloat(item.unit_price || 0);
                                                                return sum + (item.quantity * unitPrice);
                                                            }, 0)
                                                            .toLocaleString('ru-RU', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })} ₽
                                                    </strong>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button 
                                onClick={handleCreateOrder}
                                className="cta-button"
                                disabled={newOrder.items.length === 0 || !newOrder.supplier_id}
                            >
                                Создать заявку
                            </button>
                            <button 
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setNewOrder({
                                        supplier_id: '',
                                        items: []
                                    });
                                }}
                                className="secondary-btn"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;