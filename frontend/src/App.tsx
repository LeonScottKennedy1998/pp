import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import MerchandiserDashboard from './components/merchandiser/MerchandiserDashboard';
import AnalystDashboard from './components/analyst/AnalystDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import EditProfile from './components/profile/EditProfile';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import OrderSuccess from './components/order/OrderSuccess';
import {CartItem } from './types/product';
import WishlistPage from './components/wishlist/WishlistPage';
import CartPage from './components/cart/CartPage';
import ProcurementDashboard   from './components/procurement/ProcurementDashboard';
import PrivacyPolicy from './components/privacy/PrivacyPolicy';
import UserManual from './components/manuals/UserManual';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import CatalogPage from './components/common/CatalogPage';
import OrdersPage from './components/order/OrdersPage';
import HomePage from './components/common/HomePage';

import './App.css';

function App() {
    const [user, setUser] = useState<any>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [cart, setCart] = useState<CartItem[]>(() => {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const handleLogin = (userData: any) => {
        console.log('📋 Данные пользователя при входе:', userData);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
    setIsMenuOpen(false); // Закрываем меню
    alert('Вы вышли из системы');
    window.location.href = '/login';
};


    const addToCart = (product: any, showAlert: boolean = true) => {
    console.log('Добавление в корзину:', product);
    
    const existingItemIndex = cart.findIndex(item => 
        item.productId === (product.productId || product.id)
    );

    if (existingItemIndex > -1) {
        const updatedCart = [...cart];
        updatedCart[existingItemIndex].quantity += product.quantity || 1;
        setCart(updatedCart);
        
    } else {
        setCart([...cart, {
            productId: product.productId || product.id,
            name: product.name,
            price: product.price,
            quantity: product.quantity || 1
        }]);
        
    }
};

    const updateCart = (newCart: CartItem[]) => {
        setCart(newCart);
    };

    const clearCart = () => {
        setCart([]);
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        
        setCart(cart.map(item => 
            item.productId === productId 
                ? { ...item, quantity }
                : item
        ));
    };

    useEffect(() => {
        const handleUserUpdate = (event: any) => {
            const updatedUser = event.detail;
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        };

        window.addEventListener('userUpdated', handleUserUpdate);
        
        return () => {
            window.removeEventListener('userUpdated', handleUserUpdate);
        };
    }, []);

    const isMerchandiser = user?.role === 'Товаровед';
    const isAnalyst = user?.role === 'Аналитик';
    const isAdmin = user?.role === 'Администратор';

    return (
        <BrowserRouter>
            <div className="App">
                <nav className="navbar">
                    <div className="nav-brand">
                        <Link to="/" onClick={() => setIsMenuOpen(false)}>
                            <img 
                                src="/logo.png" 
                                alt="Магазин мерча" 
                                style={{ 
                                    height: '40px', 
                                    width: 'auto', 
                                    marginRight: '10px',
                                    verticalAlign: 'middle'
                                }}
                            />
                            Магазин мерча
                        </Link>
                        
                        {/* Кнопка меню для мобилок */}
                        <button 
                            className="menu-toggle"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Меню"
                        >
                            {isMenuOpen ? '✕' : '☰'}
                        </button>
                    </div>
                    
                    <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <Link to="/" onClick={() => setIsMenuOpen(false)}>Главная</Link>
                        
                        {user ? (
                            <>
                                {isAdmin ? (
                                    <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Панель администратора</Link>
                                ) : isMerchandiser ? (
                                    <Link to="/merchandiser" onClick={() => setIsMenuOpen(false)}>Панель товароведа</Link>
                                ) : isAnalyst ? (
                                    <Link to="/analyst" onClick={() => setIsMenuOpen(false)}>Панель аналитика</Link>
                                ) : user.role === 'Менеджер по закупкам' ? (
                                    <Link to="/procurement" onClick={() => setIsMenuOpen(false)}>Панель закупок</Link>
                                ) : (
                                    <>
                                        <Link to="/catalog" onClick={() => setIsMenuOpen(false)}>Каталог</Link>
                                        <Link to="/cart" className="cart-link" onClick={() => setIsMenuOpen(false)}>
                                            Корзина 
                                            {cart.length > 0 && (
                                                <span className="cart-count">{cart.length}</span>
                                            )}
                                        </Link>
                                        <Link to="/wishlist" className="wishlist-link" onClick={() => setIsMenuOpen(false)}>
                                            Избранное
                                        </Link>
                                        <Link to="/orders" onClick={() => setIsMenuOpen(false)}>Мои заказы</Link>
                                    </>
                                )}
                                <Link to="/profile/edit" className="profile-link" onClick={() => setIsMenuOpen(false)}>
                                    Профиль
                                </Link>
                                <Link to="/user-manual" className="manual-link" onClick={() => setIsMenuOpen(false)}>
                                    Руководство
                                </Link>
                                
                                {/* Разделитель для мобилок */}
                                <div className="nav-divider"></div>
                                
                                <span className="user-greeting">
                                    {user.first_name} {user.last_name}
                                </span>
                                <button onClick={handleLogout} className="logout-btn">
                                    Выйти
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/catalog" onClick={() => setIsMenuOpen(false)}>Каталог</Link>
                                <Link to="/login" onClick={() => setIsMenuOpen(false)}>Вход</Link>
                                <Link to="/register" onClick={() => setIsMenuOpen(false)}>Регистрация</Link>
                            </>
                        )}
                    </div>
                </nav>
                          
                <div className="main-content">
                    <Routes>
                        <Route path="/" element={
                            <HomePage user={user} onLogout={handleLogout} />
                        } />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/login" element={
                            <LoginPage onLogin={handleLogin} />
                        } />
                        <Route path="/catalog" element={
                            <CatalogPage addToCart={(product) => addToCart(product, true)} />

                        } />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                        <Route path="/cart" element={
                            <CartPage 
                                cart={cart} 
                                updateCart={updateCart}
                                clearCart={clearCart}
                                removeFromCart={removeFromCart}
                                updateQuantity={updateQuantity}
                                user={user}
                            />
                        } />
                        <Route path="/wishlist" element={
                            <WishlistPage addToCart={addToCart} />
                        } />
                        <Route path="/order-success/:id" element={
                            user ? (
                                <OrderSuccess />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />
                        <Route path="/orders" element={<OrdersPage />} />
                        
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        
                        <Route path="/profile/edit" element={
                            user ? (
                                <EditProfile />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                       <Route path="/procurement/orders" element={
                            user?.role === 'Менеджер по закупкам' ? 
                                <ProcurementDashboard defaultTab="orders" /> : 
                                <HomePage user={user} onLogout={() => {
                                    localStorage.removeItem('user');
                                    setUser(null);
                                }} />
                        } />

                        <Route path="/procurement/suppliers" element={
                            user?.role === 'Менеджер по закупкам' ? 
                                <ProcurementDashboard defaultTab="suppliers" /> : 
                                <HomePage user={user} onLogout={() => {
                                    localStorage.removeItem('user');
                                    setUser(null);
                                }} />
                        } />

                        <Route path="/procurement/stock" element={
                            user?.role === 'Менеджер по закупкам' ? 
                                <ProcurementDashboard defaultTab="stock" /> : 
                                <HomePage user={user} onLogout={() => {
                                    localStorage.removeItem('user');
                                    setUser(null);
                                }} />
                        } />

                        <Route path="/procurement" element={
                            user?.role === 'Менеджер по закупкам' ? 
                                <Navigate to="/procurement/orders" replace /> : 
                                <HomePage user={user} onLogout={() => {
                                    localStorage.removeItem('user');
                                    setUser(null);
                                }} />
                        } />

                        <Route path="/merchandiser/orders" element={
                            isMerchandiser ? (
                                <MerchandiserDashboard defaultTab="orders" />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/merchandiser/products" element={
                            isMerchandiser ? (
                                <MerchandiserDashboard defaultTab="products" />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/merchandiser" element={
                            isMerchandiser ? (
                                <Navigate to="/merchandiser/orders" replace />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/analyst" element={
                            isAnalyst ? (
                                <AnalystDashboard />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/admin/users" element={
                            isAdmin ? (
                                <AdminDashboard defaultTab="users" />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/admin/audit" element={
                            isAdmin ? (
                                <AdminDashboard defaultTab="audit" />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/admin/backup" element={
                            isAdmin ? (
                                <AdminDashboard defaultTab="backup" />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/admin" element={
                            isAdmin ? (
                                <Navigate to="/admin/users" replace />
                            ) : user ? (
                                <HomePage user={user} onLogout={handleLogout} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        } />

                        <Route path="/user-manual" element={
                            user ? (
                                <UserManual />
                            ) : (
                                <Navigate to="/login" />
                            )
                        } />
                    </Routes>
                </div>

                <footer className="footer">
                    <p>© 2025 Магазин мерча. Система заказов товаров с символикой Московского Приборостроительного Техникума</p>
                    <p>Производственная практика | Все права защищены</p>
                </footer>
            </div>
        </BrowserRouter>
    );
}


export default App;