import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import { API_URLS, getAuthHeaders } from '../../config/api';


const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await fetch(API_URLS.AUTH.FORGOT_PASSWORD, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при запросе сброса пароля');
            }

            setMessage(data.message);
            

            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>Восстановление пароля</h1>
                    <p>Введите email, указанный при регистрации</p>
                </div>

                <div className="auth-form">
                    {error && <div className="alert alert-error">{error}</div>}
                    {message && <div className="alert alert-success">{message}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="student@mpt.ru"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Отправка...' : 'Отправить инструкции'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <Link to="/login" className="auth-link">
                            Вернуться ко входу
                        </Link>
                        <Link to="/register" className="auth-link">
                            Регистрация
                        </Link>
                    </div>

                    <div className="auth-note">
                        <p>📧 На указанный email придет письмо со ссылкой для сброса пароля.</p>
                        <p>⏰ Ссылка действительна 1 час.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;