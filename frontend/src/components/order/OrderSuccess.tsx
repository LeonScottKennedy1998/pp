import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    navigate('/orders');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(countdownInterval);
        };
    }, [navigate]);

    return (
        <div className="order-success-page">
            <div className="order-success-container">
                <div className="success-icon-wrapper">
                    <div className="success-icon">✓</div>
                </div>
                
                <h1>Заказ оформлен успешно!</h1>
                
                <div className="order-id">
                    Номер заказа: <strong>#{id}</strong>
                </div>
                
                <div className="success-message">
                    <p>Ваш заказ успешно оформлен и принят в обработку.</p>
                    <p>Чек и детали заказа отправлены на вашу почту.</p>
                    <p>Товары зарезервированы на складе.</p>
                </div>
                
                <div className="whats-next">
                    <h3>Что дальше?</h3>
                    <ul>
                        <li>Проверьте почту - там детали заказа</li>
                        <li>Ожидайте звонка для подтверждения</li>
                        <li>Отслеживайте статус в разделе "Мои заказы"</li>
                    </ul>
                </div>
                
                <div className="success-actions">
                    <Link to="/orders">
                        <button className="success-btn primary-btn">
                            <span>📋</span>
                            Перейти к моим заказам
                        </button>
                    </Link>
                    
                    <Link to="/catalog">
                        <button className="success-btn secondary-btn">
                            <span>🛒</span>
                            Продолжить покупки
                        </button>
                    </Link>
                    
                    <Link to="/">
                        <button className="success-btn home-btn">
                            <span>🏠</span>
                            На главную
                        </button>
                    </Link>
                </div>
                
                <div className="redirect-timer">
                    Автоматический переход через {countdown} секунд...
                </div>
                
                <div className="support-info">
                    <p>По вопросам о заказе:</p>
                    <p>📞 Телефон: +7 (495) 123-45-67</p>
                    <p>📧 Email: shop@mpt.ru</p>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;