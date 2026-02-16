import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { API_URLS, getAuthHeaders } from '../../config/api';
import TwoFactorSettings from './TwoFactorSettings';

interface UserProfile {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    patronymic: string;
    phone: string;
    is_active: boolean;
    created_at: string;
}

const EditProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        patronymic: '',
        phone: ''
    });
    
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        
        try {
            const response = await fetch(API_URLS.AUTH.PROFILE, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки профиля');
            
            const data = await response.json();
            console.log('📋 Данные профиля:', data.user);
            
            setUser(data.user);
            setProfileData({
                first_name: data.user.first_name || '',
                last_name: data.user.last_name || '',
                patronymic: data.user.patronymic || '',
                phone: data.user.phone || ''
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({
            ...profileData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        
        try {
            const response = await fetch(API_URLS.AUTH.UPDATE_PROFILE, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка обновления профиля');
            
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = {
                ...storedUser,
                first_name: data.user.first_name,
                last_name: data.user.last_name,
                patronymic: data.user.patronymic,
                phone: data.user.phone
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            window.dispatchEvent(new CustomEvent('userUpdated', {
                detail: updatedUser
            }));
            
            setSuccess('Профиль успешно обновлен!');
            setTimeout(() => setSuccess(''), 3000);
            
            setUser(data.user);
            
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Новый пароль и подтверждение не совпадают');
            return;
        }
        
        if (passwordData.newPassword.length < 6) {
            setError('Новый пароль должен содержать минимум 6 символов');
            return;
        }
        
        
        try {
            const response = await fetch(API_URLS.AUTH.CHANGE_PASSWORD, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка смены пароля');
            
            setSuccess('Пароль успешно изменен!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setTimeout(() => setSuccess(''), 3000);
            
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading">Загрузка профиля...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="page">
                <div className="error-message">Пользователь не найден</div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="profile-header">
                <h1>Редактирование профиля</h1>
                <button 
                    onClick={() => navigate(-1)}
                    className="back-btn"
                >
                    ← Назад
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="profile-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    👤 Личные данные
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
                    onClick={() => setActiveTab('password')}
                >
                    🔑 Смена пароля
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    🔒 Безопасность
                </button>
            </div>

            <div className="profile-content">
                {activeTab === 'profile' ? (
                    <div className="profile-form">
                        <div className="user-info-summary">
                            <h3>Текущие данные</h3>
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Роль:</strong> {user.role}</p>
                            <p><strong>Дата регистрации:</strong> {new Date(user.created_at).toLocaleDateString('ru-RU')}</p>
                        </div>

                        <form onSubmit={handleProfileSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Фамилия *</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={profileData.last_name}
                                        onChange={handleProfileChange}
                                        placeholder="Иванов"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Имя *</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={profileData.first_name}
                                        onChange={handleProfileChange}
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
                                    value={profileData.patronymic}
                                    onChange={handleProfileChange}
                                    placeholder="Иванович"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Телефон *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    placeholder="+7 (999) 123-45-67"
                                    required
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="submit" className="cta-button">
                                    Сохранить изменения
                                </button>
                                <button 
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => navigate(-1)}
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                ) : activeTab === 'password' ? (
                    <div className="password-form">
                        <div className="password-info">
                            <h3>Смена пароля</h3>
                            <p>Для смены пароля введите текущий пароль и новый пароль.</p>
                            <p className="password-hint">
                                Пароль должен содержать минимум 6 символов.
                            </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label>Текущий пароль *</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Новый пароль *</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Подтверждение нового пароля *</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="submit" className="cta-button">
                                    Сменить пароль
                                </button>
                                <button 
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setActiveTab('profile')}
                                >
                                    Назад к профилю
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="security-form">
                        <div className="security-info">
                            <h3>Настройки безопасности</h3>
                            <p>Управление параметрами безопасности вашего аккаунта.</p>
                        </div>
                        
                        <TwoFactorSettings />
                        
                        <div className="security-tips">
                            <h4>💡 Советы по безопасности:</h4>
                            <ul>
                                <li>Используйте сложный пароль из 8+ символов</li>
                                <li>Не используйте один пароль на нескольких сайтах</li>
                                <li>Выходите из системы на общественных компьютерах</li>
                                <li>Регулярно проверяйте историю входов в аккаунт</li>
                            </ul>
                        </div>
                        
                        <div className="form-actions">
                            <button 
                                type="button"
                                className="secondary-btn"
                                onClick={() => setActiveTab('profile')}
                            >
                                ← Назад к профилю
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditProfile;