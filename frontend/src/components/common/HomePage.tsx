import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

interface HomePageProps {
    user: any;
    onLogout: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ user, onLogout }) => {
    return (
        <div className="page">
            <h1>Добро пожаловать в магазин мерча!</h1>
            
            {user ? (
                <div className="user-welcome">
                    <div className="user-card">
                        <h2>👋 Привет, {user.first_name} {user.last_name}!</h2>
                        <Link to="/profile/edit">
                            <button className="edit-profile-btn">
                                Редактировать профиль
                            </button>
                        </Link>
                    </div>
                    
                    <div className="features">
                        {user.role === 'Клиент' && (
                            <>
                                <div className="feature-card">
                                    <h3>🛒 Каталог товаров</h3>
                                    <p>Выбирайте товары с символикой предприятия</p>
                                    <Link to="/catalog">
                                        <button className="feature-btn">Перейти к каталогу</button>
                                    </Link>
                                </div>
                                <div className="feature-card">
                                    <h3>📦 Мои заказы</h3>
                                    <p>Отслеживайте статусы ваших заказов</p>
                                    <Link to="/orders">
                                        <button className="feature-btn">Просмотреть заказы</button>
                                    </Link>
                                </div>
                            </>
                        )}
                        
                        {user.role === 'Менеджер по закупкам' && (
                            <>
                                <div className="feature-card">
                                    <h3>👥 Управление поставщиками</h3>
                                    <p>Добавляйте и редактируйте поставщиков</p>
                                    <Link to="/procurement/suppliers">
                                        <button className="feature-btn">Управление поставщиками</button>
                                    </Link>
                                </div>
                                <div className="feature-card">
                                    <h3>📦 Заявки на закупку</h3>
                                    <p>Создавайте и отслеживайте заявки</p>
                                    <Link to="/procurement/orders">
                                        <button className="feature-btn">Управление заявками</button>
                                    </Link>
                                </div>
                                <div className="feature-card">
                                    <h3>📊 Аналитика остатков</h3>
                                    <p>Планируйте закупки на основе остатков</p>
                                    <Link to="/procurement/stock">
                                        <button className="feature-btn">Аналитика склада</button>
                                    </Link>
                                </div>
                            </>
                        )}

                        {user.role === 'Товаровед' && (
                            <>
                                <div className="feature-card">
                                    <h3>📦 Управление товарами</h3>
                                    <p>Добавляйте и редактируйте товары</p>
                                    <Link to="/merchandiser/products">
                                        <button className="feature-btn">Управление товарами</button>
                                    </Link>
                                </div>
                                <div className="feature-card">
                                    <h3>📋 Управление заказами</h3>
                                    <p>Обрабатывайте заказы клиентов</p>
                                    <Link to="/merchandiser/orders">
                                        <button className="feature-btn">Управление заказами</button>
                                    </Link>
                                </div>
                            </>
                        )}
                    
                        {user.role === 'Администратор' && (
                            <>
                                <div className="feature-card">
                                    <h3>👥 Управление пользователями</h3>
                                    <p>Добавляйте пользователей и назначайте роли</p>
                                    <Link to="/admin/users">
                                        <button className="feature-btn">Управление пользователями</button>
                                    </Link>
                                </div>
                                <div className="feature-card">
                                    <h3>📋 Журнал аудита</h3>
                                    <p>Просматривайте историю действий в системе</p>
                                    <Link to="/admin/audit">
                                        <button className="feature-btn">Просмотреть аудит</button>
                                    </Link>
                                </div>
                                <div className="feature-card">
                                    <h3>💾 Резервное копирование</h3>
                                    <p>Создавайте и скачивайте бэкапы системы в JSON и SQL</p>
                                    <Link to="/admin/backup">
                                        <button className="feature-btn">Управление бэкапами</button>
                                    </Link>
                                </div>
                            </>
                        )}
                        
                        {user.role === 'Аналитик' && (
                            <div className="feature-card">
                                <h3>📊 Аналитика и отчеты</h3>
                                <p>Просматривайте статистику и экспортируйте данные</p>
                                <Link to="/analyst">
                                    <button className="feature-btn">Перейти к аналитике</button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="guest-welcome">
                    <p>Система заказов товаров с символикой Московского Приборостроительного Техникума</p>
                    
                    <div className="features">
                        <div className="feature-card">
                            <h3>🎓 Для студентов</h3>
                            <p>Заказывайте мерч с символикой предприятия</p>
                        </div>
                        <div className="feature-card">
                            <h3>📦 Заказы</h3>
                            <p>Оформляйте заказы на новые коллекции</p>
                        </div>
                        <div className="feature-card">
                            <h3>⭐ Эксклюзивные товары</h3>
                            <p>Уникальный мерч только у нас</p>
                        </div>
                    </div>
                    
                    <div className="auth-actions" style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        gap: '16px', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: '24px',
                        flexWrap: 'wrap' /* на мобилках перенесутся */
                    }}>
                        <Link to="/register" style={{ flex: '0 1 auto' }}>
                            <button className="cta-button" style={{
                                margin: 0,
                                whiteSpace: 'nowrap'
                            }}>
                                Зарегистрироваться
                            </button>
                        </Link>
                        
                        <Link to="/login" style={{ flex: '0 1 auto' }}>
                            <button className="secondary-button" style={{
                                margin: 0,
                                whiteSpace: 'nowrap'
                            }}>
                                Войти в систему
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;