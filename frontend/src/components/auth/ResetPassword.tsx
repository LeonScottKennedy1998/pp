import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import { API_URLS, getAuthHeaders } from '../../config/api';


const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setTokenValid(false);
                setValidating(false);
                return;
            }

            try {
                const response = await fetch(API_URLS.AUTH.RESET_PASSWORD(token));
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Токен недействителен');
                }

                setTokenValid(true);
                setEmail(data.email);
            } catch (err: any) {
                setError(err.message);
                setTokenValid(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        if (formData.password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_URLS.AUTH.RESET_PASSWORD(token), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ password: formData.password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при сбросе пароля');
            }

            setMessage('✅ Пароль успешно изменен!');
            
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="loading">Проверка токена...</div>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <div className="auth-header">
                        <h1>Недействительная ссылка</h1>
                    </div>
                    
                    <div className="error-message">
                        {error || 'Ссылка для сброса пароля недействительна или истек срок её действия.'}
                    </div>
                    
                    <div className="auth-footer">
                        <Link to="/forgot-password" className="auth-link">
                            Запросить новую ссылку
                        </Link>
                        <Link to="/login" className="auth-link">
                            Вернуться ко входу
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>Создание нового пароля</h1>
                    <p>Для аккаунта: {email}</p>
                </div>

                <div className="auth-form">
                    {error && <div className="alert alert-error">{error}</div>}
                    {message && <div className="alert alert-success">{message}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="password">Новый пароль</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Минимум 6 символов"
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Подтвердите пароль</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Повторите пароль"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Сохранение...' : 'Изменить пароль'}
                        </button>
                    </form>

                    <div className="password-rules">
                        <p><strong>Требования к паролю:</strong></p>
                        <ul>
                            <li>Минимум 6 символов</li>
                            <li>Рекомендуется использовать буквы, цифры и символы</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;