// src/components/auth/RegisterPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URLS, getAuthHeaders } from '../../config/api';
import './Auth.css';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        patronymic: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!acceptedPrivacy) {
            setError('Необходимо принять соглашение об обработке персональных данных');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }
        
        if (formData.password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
        if (!phoneRegex.test(formData.phone)) {
            setError('Неверный формат телефона');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await fetch(API_URLS.AUTH.REGISTER, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    patronymic: formData.patronymic || undefined,
                    phone: formData.phone
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации');
            }
            
            alert('Регистрация успешна! Теперь войдите в систему.');
            navigate('/login');
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page auth-page"> {/* Добавляем класс auth-page */}
            <div className="auth-container">
                <div className="auth-header">
                    <h1>Регистрация</h1>
                    <p>Создайте учетную запись для доступа к магазину МПТ</p>
                </div>
                
                <div className="auth-form">
                    {error && <div className="alert alert-error">{error}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="student@mpt.ru"
                                required
                            />
                        </div>
                        
                        <div className="form-row" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Пароль *</label>
                                <input 
                                    type="password" 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    style={{ width: '100%', height: '48px' }} 
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Подтвердите пароль *</label>
                                <input 
                                    type="password" 
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    style={{ width: '100%', height: '48px' }} 
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Фамилия *</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Иванов"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Имя *</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="Иван"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label>Отчество</label>
                            <input
                                type="text"
                                name="patronymic"
                                value={formData.patronymic}
                                onChange={handleChange}
                                placeholder="Иванович"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Телефон *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+7 (999) 123-45-67"
                                required
                            />
                            <small>Пример: +7 (999) 123-45-67</small>
                        </div>
                        
                        <div className="privacy-agreement">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={acceptedPrivacy}
                                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                                    className="privacy-checkbox"
                                />
                                <span className="privacy-text">
                                    Я согласен(а) с{' '}
                                    <Link 
                                        to="/privacy-policy" 
                                        target="_blank" 
                                        className="privacy-link"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        политикой обработки персональных данных
                                    </Link>
                                </span>
                            </label>
                        </div>
                        
                        <div className="password-rules">
                            <p><strong>Требования к паролю:</strong></p>
                            <ul>
                                <li>Минимум 6 символов</li>
                                <li>Рекомендуется использовать буквы, цифры и специальные символы</li>
                                <li>Не используйте простые пароли (123456, password, qwerty)</li>
                            </ul>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading || !acceptedPrivacy}
                        >
                            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                        </button>
                    </form>
                    
                    <div className="auth-footer">
                        <Link to="/login" className="auth-link">Уже есть аккаунт? Войти</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;