import React, { useState, useEffect } from 'react';
import './Admin.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    patronymic?: string;
    phone: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        patronymic: '',
        phone: '',
        role: 'Клиент',
        is_active: true
    });

    const [passwordResetData, setPasswordResetData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const roles = ['Администратор', 'Товаровед', 'Аналитик', 'Клиент'];

    const fetchUsers = async () => {
        
        try {
            const response = await fetch(API_URLS.USERS.BASE, {
                headers: getAuthHeaders()

            });
            
            if (!response.ok) throw new Error('Ошибка загрузки пользователей');
            
            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordResetData({
            ...passwordResetData,
            [e.target.name]: e.target.value
        });
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const response = await fetch(API_URLS.USERS.BASE, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка создания пользователя');
            
            alert('Пользователь успешно создан!');
            setShowAddForm(false);
            setFormData({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                patronymic: '',
                phone: '',
                role: 'Клиент',
                is_active: true
            });
            fetchUsers();
            
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        
        
        try {
            const response = await fetch(API_URLS.USERS.BY_ID(editingUser.id), {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    patronymic: formData.patronymic,
                    phone: formData.phone,
                    role: formData.role,
                    is_active: formData.is_active
                })
            });

            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка обновления пользователя');
            
            alert('Пользователь успешно обновлен!');
            setEditingUser(null);
            setFormData({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                patronymic: '',
                phone: '',
                role: 'Клиент',
                is_active: true
            });
            fetchUsers();
            
        } catch (err: any) {
            alert(err.message);
        }
    };

    const toggleUserStatus = async (userId: number, isActive: boolean) => {
        const action = isActive ? 'block' : 'unblock';
        const confirmMessage = isActive 
            ? 'Вы уверены, что хотите заблокировать пользователя?' 
            : 'Вы уверены, что хотите разблокировать пользователя?';
        
        if (!window.confirm(confirmMessage)) return;
        
        try {
            const response = await fetch(API_URLS.USERS.TOGGLE_BLOCK(userId, action), {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка изменения статуса');
            
            alert(data.message);
            fetchUsers();
            
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handlePasswordReset = async () => {
        if (!selectedUser) return;
        
        if (passwordResetData.newPassword !== passwordResetData.confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        if (passwordResetData.newPassword.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }
        
        
        try {
            const response = await fetch(API_URLS.USERS.RESET_PASSWORD(selectedUser.id), {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    newPassword: passwordResetData.newPassword
                })
            });

            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Ошибка сброса пароля');
            
            alert('Пароль успешно сброшен!');
            setPasswordResetData({
                newPassword: '',
                confirmPassword: ''
            });
            
        } catch (err: any) {
            alert(err.message);
        }
    };

    const startEditUser = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            first_name: user.first_name,
            last_name: user.last_name,
            patronymic: user.patronymic || '',
            phone: user.phone,
            role: user.role,
            is_active: user.is_active
        });
    };

    if (loading) return <div className="loading">Загрузка пользователей...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>Управление пользователями</h1>
                <button 
                    onClick={() => setShowAddForm(true)}
                    className="cta-button"
                >
                    + Добавить пользователя
                </button>
            </div>

            {(showAddForm || editingUser) && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>{editingUser ? 'Редактирование пользователя' : 'Добавление пользователя'}</h2>
                        
                        <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Имя *</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleFormChange}
                                        placeholder="Иван"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Фамилия *</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleFormChange}
                                        placeholder="Иванов"
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
                                    onChange={handleFormChange}
                                    placeholder="Иванович"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleFormChange}
                                    placeholder="user@mpt.ru"
                                    required
                                    disabled={!!editingUser}
                                />
                            </div>
                            
                            {!editingUser && (
                                <div className="form-group">
                                    <label>Пароль *</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleFormChange}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            )}
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Телефон *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleFormChange}
                                        placeholder="+7 (999) 123-45-67"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Роль *</label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleFormChange}
                                        required
                                    >
                                        {roles.map(role => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="checkbox-group">
    <input
        type="checkbox"
        id="is_active"
        name="is_active"
        checked={formData.is_active}
        onChange={(e) =>
            setFormData({ ...formData, is_active: e.target.checked })
        }
    />
    <label htmlFor="is_active">Активный аккаунт</label>
</div>
                            
                            <div className="modal-actions">
                                <button type="submit" className="cta-button">
                                    {editingUser ? 'Сохранить изменения' : 'Добавить пользователя'}
                                </button>
                                <button 
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setEditingUser(null);
                                        setFormData({
                                            email: '',
                                            password: '',
                                            first_name: '',
                                            last_name: '',
                                            patronymic: '',
                                            phone: '',
                                            role: 'Клиент',
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

            {selectedUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Сброс пароля для {selectedUser.email}</h2>
                        
                        <div className="form-group">
                            <label>Новый пароль *</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordResetData.newPassword}
                                onChange={handlePasswordResetChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Подтвердите пароль *</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordResetData.confirmPassword}
                                onChange={handlePasswordResetChange}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                onClick={handlePasswordReset}
                                className="cta-button"
                                disabled={!passwordResetData.newPassword || !passwordResetData.confirmPassword}
                            >
                                Сбросить пароль
                            </button>
                            <button 
                                type="button"
                                className="secondary-btn"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setPasswordResetData({
                                        newPassword: '',
                                        confirmPassword: ''
                                    });
                                }}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="users-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ФИО</th>
                            <th>Email</th>
                            <th>Телефон</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th>Дата регистрации</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>#{user.id}</td>
                                <td>
                                    {user.last_name} {user.first_name} {user.patronymic || ''}
                                </td>
                                <td>{user.email}</td>
                                <td>{user.phone}</td>
                                <td>
                                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                        {user.is_active ? 'Активен' : 'Заблокирован'}
                                    </span>
                                </td>
                                <td>
                                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button 
                                            onClick={() => startEditUser(user)}
                                            className="edit-btn"
                                        >
                                            Редактировать
                                        </button>
                                        <button 
                                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                                            className={user.is_active ? 'block-btn' : 'unblock-btn'}
                                        >
                                            {user.is_active ? 'Блокировать' : 'Разблокировать'}
                                        </button>
                                        <button 
                                            onClick={() => setSelectedUser(user)}
                                            className="reset-btn"
                                        >
                                            Сброс пароля
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {users.length === 0 && (
                <div className="empty-state">
                    <p>Пользователи не найдены</p>
                </div>
            )}
            
            <div className="info-card">
                <h4>📋 Информация</h4>
                <ul>
                    <li>Пароли пользователей хранятся в зашифрованном виде</li>
                    <li>ФИО пользователей шифруются в базе данных</li>
                    <li>Все действия администратора записываются в журнал аудита</li>
                    <li>Администратор не может заблокировать самого себя</li>
                </ul>
            </div>
        </div>
    );
};

export default UserManagement;