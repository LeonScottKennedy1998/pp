import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './WishlistPage.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface WishlistItem {
    wishlist_id: number;
    product_id: number;
    product_name: string;
    description: string;
    price: number;
    final_price: number;
    stock: number;
    image_url: string;
    category_name: string;
    added_at: string;
    has_discount: boolean;
    discount_percent: number;
}

interface WishlistPageProps {
    addToCart: (product: any) => void;
}

const WishlistPage: React.FC<WishlistPageProps> = ({ addToCart }) => {
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    console.log('🔄 Загрузка избранного...');
    console.log('Токен:', token ? 'есть' : 'нет');
    console.log('Пользователь:', user);
    console.log('Роль пользователя:', user?.role);
    
    if (!token) {
        setError('Требуется авторизация');
        setLoading(false);
        return;
    }

    if (user?.role !== 'Клиент') {
        setError('Только клиенты могут просматривать избранное');
        setLoading(false);
        return;
    }

    try {
        console.log('📡 Отправка запроса на:', 'http://localhost:5001/api/wishlist');
        
        const response = await fetch(API_URLS.WISHLIST.BASE, {
            headers: getAuthHeaders()
        });

        console.log('📨 Ответ сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера:', errorText);
            throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Данные избранного:', data);
        setWishlistItems(data);
    } catch (err: any) {
        console.error('❌ Ошибка загрузки избранного:', err);
        setError(err.message || 'Ошибка загрузки избранного');
    } finally {
        setLoading(false);
    }
};

    const handleRemoveFromWishlist = async (productId: number) => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(API_URLS.WISHLIST.BY_PRODUCT_ID(productId), {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Ошибка удаления из избранного');
            }

            setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
            
        } catch (err: any) {
            alert(err.message);
        }
    };

     const handleAddToCart = (item: WishlistItem) => {
        const productForCart = {
            productId: item.product_id,
            name: item.product_name,
            price: item.has_discount ? item.final_price : item.price,
            quantity: 1,
            originalPrice: item.price,
            discount: item.has_discount ? item.discount_percent : 0
        };
        
        if (addToCart) {
            addToCart(productForCart);
            alert(`${item.product_name} добавлен в корзину!`);
            
        } else {
            console.error('Функция addToCart не определена');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU');
    };

    if (loading) {
        return (
            <div className="page">
                <h1>Избранное</h1>
                <div className="loading">Загрузка избранного...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page">
                <h1>Избранное</h1>
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="wishlist-header">
                <h1>⭐ Избранное</h1>
                <p className="wishlist-subtitle">
                    Ваши любимые товары ({wishlistItems.length} шт.)
                </p>
            </div>

            {wishlistItems.length === 0 ? (
                <div className="empty-wishlist">
                    <div className="empty-icon">★</div>
                    <h2>Ваше избранное пусто</h2>
                    <p>Добавляйте товары в избранное, нажимая на сердечко ❤️</p>
                    <Link to="/catalog">
                        <button className="cta-button">
                            Перейти в каталог
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="wishlist-container">
                    <div className="wishlist-grid">
                        {wishlistItems.map(item => (
                            <div key={item.wishlist_id} className="wishlist-item">
                                <div className="wishlist-item-header">
                                    <span className="wishlist-date">
                                        Добавлено: {formatDate(item.added_at)}
                                    </span>
                                    <button 
                                        className="remove-from-wishlist-btn"
                                        onClick={() => handleRemoveFromWishlist(item.product_id)}
                                        title="Удалить из избранного"
                                    >
                                        ❌
                                    </button>
                                </div>
                                
                                <Link to={`/catalog`} className="wishlist-product-link">
                                    <div className="wishlist-product-image">
                                        {item.image_url ? (
                                            <img 
                                                src={item.image_url} 
                                                alt={item.product_name}
                                                className="wishlist-img"
                                            />
                                        ) : (
                                            <div className="wishlist-image-placeholder">
                                                {item.product_name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="wishlist-product-info">
                                        <h3>{item.product_name}</h3>
                                        <p className="wishlist-category">
                                            Категория: {item.category_name}
                                        </p>
                                        <p className="wishlist-description">
                                            {item.description.length > 100 
                                                ? `${item.description.substring(0, 100)}...` 
                                                : item.description}
                                        </p>
                                        
                                        <div className="wishlist-price-info">
                                            {item.has_discount ? (
                                                <>
                                                    <span className="wishlist-old-price">
                                                        {item.price.toLocaleString()} ₽
                                                    </span>
                                                    <span className="wishlist-final-price">
                                                        {item.final_price.toLocaleString()} ₽
                                                    </span>
                                                    <span className="wishlist-discount-badge">
                                                        -{item.discount_percent}%
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="wishlist-price">
                                                    {item.price.toLocaleString()} ₽
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="wishlist-stock">
                                            {item.stock > 0 ? (
                                                <span className="in-stock">✓ В наличии</span>
                                            ) : (
                                                <span className="out-of-stock">✗ Нет в наличии</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                                
                                <div className="wishlist-actions">
                                    <button 
                                        className="wishlist-add-to-cart-btn"
                                        onClick={() => handleAddToCart(item)}
                                        disabled={item.stock === 0}
                                    >
                                        🛒 Добавить в корзину
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="wishlist-actions-bottom">
                        <Link to="/catalog">
                            <button className="secondary-btn">
                                ← Продолжить покупки
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WishlistPage;