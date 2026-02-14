import React, { useState, useEffect } from 'react';
import './ProcurementDashboard.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface Supplier {
    supplier_id: number;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    rating: number;
    is_active: boolean;
    created_at: string;
    completed_orders?: number;
    cancelled_orders?: number;
    total_revenue?: number;
    avg_order_amount?: number;
    last_order_date?: string;
}

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        rating: 3,
        is_active: true
    });

    const fetchSuppliers = async () => {
        try {
            const response = await fetch(API_URLS.PROCUREMENT.SUPPLIERS, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            setSuppliers(data);
        } catch (error) {
            console.error('Ошибка загрузки поставщиков:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const url = editingSupplier 
            ? API_URLS.PROCUREMENT.SUPPLIER_BY_ID(editingSupplier.supplier_id)
            : API_URLS.PROCUREMENT.SUPPLIERS;
            
            const method = editingSupplier ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                alert(editingSupplier ? 'Поставщик обновлен' : 'Поставщик создан');
                setShowForm(false);
                setEditingSupplier(null);
                setFormData({
                    name: '',
                    contact_person: '',
                    email: '',
                    phone: '',
                    rating: 3,
                    is_active: true
                });
                fetchSuppliers();
            } else {
                const error = await response.json();
                alert(error.error || 'Ошибка сохранения');
            }
        } catch (error) {
            alert('Ошибка сохранения поставщика');
        }
    };

    const startEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            rating: supplier.rating,
            is_active: supplier.is_active
        });
        setShowForm(true);
    };

    const toggleStatus = async (supplierId: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        if (!window.confirm(`Вы уверены, что хотите ${newStatus ? 'активировать' : 'деактивировать'} поставщика?`)) return;
        
        try {
            const response = await fetch(API_URLS.PROCUREMENT.SUPPLIER_BY_ID(supplierId), {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_active: newStatus })
            });
            
            if (response.ok) {
                alert('Статус обновлен');
                fetchSuppliers();
            }
        } catch (error) {
            alert('Ошибка обновления статуса');
        }
    };

    const renderRatingStars = (rating: number) => {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    };

    if (loading) return <div className="loading">Загрузка поставщиков...</div>;

    return (
        <div className="supplier-management">
            <div className="section-header">
                <h2>Управление поставщиками</h2>
                <button onClick={() => setShowForm(true)} className="cta-button">
                    + Добавить поставщика
                </button>
            </div>

            <div className="suppliers-grid">
                {suppliers.map(supplier => (
                    <div key={supplier.supplier_id} className="supplier-card">
                        <div className="supplier-header">
                            <h3>{supplier.name}</h3>
                            <span className={`status-badge ${supplier.is_active ? 'active' : 'inactive'}`}>
                                {supplier.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                        
                        <div className="supplier-info">
                            {supplier.contact_person && (
                                <p><strong>Контактное лицо:</strong> {supplier.contact_person}</p>
                            )}
                            {supplier.email && (
                                <p><strong>Email:</strong> {supplier.email}</p>
                            )}
                            {supplier.phone && (
                                <p><strong>Телефон:</strong> {supplier.phone}</p>
                            )}
                            <p><strong>Рейтинг:</strong> 
                                <span className="rating-stars" title={`${supplier.rating}/5`}>
                                    {'★'.repeat(Math.round(supplier.rating || 0))}
                                    {'☆'.repeat(5 - Math.round(supplier.rating || 0))}
                                    <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>
                                        ({supplier.rating?.toFixed(1) || 0}/5)
                                    </span>
                                </span>
                            </p>
                            <p><strong>Завершенных заказов:</strong> {supplier.completed_orders || 0}</p>
                            <p><strong>Отмененных заказов:</strong> {supplier.cancelled_orders || 0}</p>
                            <p><strong>Общая выручка:</strong> {supplier.total_revenue?.toLocaleString() || 0} ₽</p>
                            <p><strong>Средний чек:</strong> {supplier.avg_order_amount?.toLocaleString() || 0} ₽</p>
                            {supplier.last_order_date && (
                                <p><strong>Последний заказ:</strong> {new Date(supplier.last_order_date).toLocaleDateString()}</p>
                            )}
                            <p><strong>С нами с:</strong> {new Date(supplier.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="supplier-actions">
                            <button onClick={() => startEdit(supplier)} className="edit-btn">
                                Редактировать
                            </button>
                            <button 
                                onClick={() => toggleStatus(supplier.supplier_id, supplier.is_active)}
                                className={supplier.is_active ? 'deactivate-btn' : 'activate-btn'}
                            >
                                {supplier.is_active ? 'Деактивировать' : 'Активировать'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {suppliers.length === 0 && (
                <div className="empty-state">
                    <p>Поставщики не найдены</p>
                </div>
            )}

            {/* Модалка формы */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>{editingSupplier ? 'Редактирование поставщика' : 'Добавление поставщика'}</h2>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Название компании *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Контактное лицо</label>
                                    <input
                                        type="text"
                                        name="contact_person"
                                        value={formData.contact_person}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Рейтинг (1-5)</label>
                                    <select
                                        name="rating"
                                        value={formData.rating}
                                        onChange={handleFormChange}
                                    >
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <option key={num} value={num}>{num} ★</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Телефон</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleFormChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleFormChange}
                                    />
                                    Активный поставщик
                                </label>
                            </div>
                            
                            <div className="modal-actions">
                                <button type="submit" className="cta-button">
                                    {editingSupplier ? 'Сохранить' : 'Создать'}
                                </button>
                                <button 
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingSupplier(null);
                                        setFormData({
                                            name: '',
                                            contact_person: '',
                                            email: '',
                                            phone: '',
                                            rating: 3,
                                            is_active: true
                                        });
                                    }}
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierManagement;