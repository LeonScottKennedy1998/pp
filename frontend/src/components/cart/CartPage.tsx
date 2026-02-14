import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CartPage.css';
import {  API_URLS, getAuthHeaders } from '../../config/api';

interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
}

interface CartPageProps {
    cart: CartItem[];
    updateCart: (cart: CartItem[]) => void;
    clearCart: () => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    user: any;
}


const CartPage: React.FC<CartPageProps> = ({ 
    cart, 
    clearCart, 
    removeFromCart, 
    updateQuantity,
    user 
}) => {
    const [phone, setPhone] = useState(user?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productsData, setProductsData] = useState<Map<number, any>>(new Map());
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (cart.length > 0) {
            fetchProductsData();
        }
    }, [cart]);

    useEffect(() => {
        if (user?.phone) {
            setPhone(user.phone);
        }
    }, [user]);

    const fetchProductsData = async () => {
        try {
            const productIds = cart.map(item => item.productId);
            
            const response = await fetch(API_URLS.PRODUCTS.BATCH, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ productIds })
            });

            if (response.ok) {
                const data = await response.json();
                const productsMap = new Map();
                data.forEach((product: any) => {
                    productsMap.set(product.id, product);
                });
                setProductsData(productsMap);
            }
        } catch (error) {
            console.error('Ошибка загрузки информации о товарах:', error);
        }
    };

    const getProductData = (productId: number) => {
        return productsData.get(productId) || { 
            price: cart.find(item => item.productId === productId)?.price || 0,
            has_discount: false 
        };
    };

    const calculateItemPrice = (item: CartItem) => {
        const productData = getProductData(item.productId);
        
        if (productData.has_discount && productData.final_price) {
            return productData.final_price;
        }
        
        return item.price;
    };

    const calculateItemTotal = (item: CartItem) => {
        const price = calculateItemPrice(item);
        return price * item.quantity;
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + calculateItemTotal(item), 0);
    };
    
    const handleSubmitOrder = async () => {
        if (!token) {
            alert('Для оформления заказа необходимо войти в систему');
            navigate('/login');
            return;
        }

        if (cart.length === 0) {
            alert('Корзина пуста');
            return;
        }

        if (!phone.trim()) {
            alert('Введите телефон для связи');
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                })),
                phone: phone.trim()
            };

            const response = await fetch(API_URLS.ORDERS.CREATE, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка оформления заказа');
            }

            clearCart();
            navigate(`/order-success/${data.order.id}`);

        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="page">
                <h1>Корзина</h1>
                <div className="empty-cart">
                    <p>Ваша корзина пуста</p>
                    <Link to="/catalog">
                        <button className="cta-button">Перейти к каталогу</button>
                    </Link>
                </div>
            </div>
        );
    }

    const originalTotal = cart.reduce((total, item) => {
        const productData = getProductData(item.productId);
        const originalPrice = productData.original_price || item.price;
        return total + (originalPrice * item.quantity);
    }, 0);
    
    const finalTotal = calculateTotal();
    const savedAmount = originalTotal - finalTotal;

    return (
        <div className="page">
            <h1>Корзина</h1>
            
            <div className="cart-container">
                <div className="cart-items">
                    <table className="cart-table">
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Цена</th>
                                <th>Количество</th>
                                <th>Сумма</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map(item => {
                                const productData = getProductData(item.productId);
                                const itemPrice = calculateItemPrice(item);
                                const itemTotal = calculateItemTotal(item);
                                
                                return (
                                    <tr key={item.productId}>
                                        <td>
                                            <div className="cart-item-name">
                                                {item.name}
                                                {productData.has_discount && (
                                                    <span className="cart-discount-badge">
                                                        -{productData.discount_percent}%
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {productData.has_discount ? (
                                                <div className="cart-price-container">
                                                    <span className="cart-original-price">
                                                        {item.price.toLocaleString()} ₽
                                                    </span>
                                                    <span className="cart-final-price">
                                                        {itemPrice.toLocaleString()} ₽
                                                    </span>
                                                </div>
                                            ) : (
                                                <span>{itemPrice.toLocaleString()} ₽</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="quantity-control">
                                                <button 
                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                    className="quantity-btn"
                                                >
                                                    -
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button 
                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                    className="quantity-btn"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td>{itemTotal.toLocaleString()} ₽</td>
                                        <td>
                                            <button 
                                                onClick={() => removeFromCart(item.productId)}
                                                className="remove-btn"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    <div className="cart-actions">
                        <button onClick={clearCart} className="secondary-btn">
                            Очистить корзину
                        </button>
                        <Link to="/catalog">
                            <button className="secondary-btn">
                                Продолжить покупки
                            </button>
                        </Link>
                    </div>
                </div>
                
                <div className="cart-summary">
                    <h3>Итог заказа</h3>
                    
                    <div className="summary-row">
                        <span>Товаров:</span>
                        <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} шт.</span>
                    </div>
                    
                    {savedAmount > 0 && (
                        <>
                            <div className="summary-row">
                                <span>Скидка:</span>
                                <span className="saved-amount">-{savedAmount.toLocaleString()} ₽</span>
                            </div>
                            <div className="summary-row original-total">
                                <span>Без скидки:</span>
                                <span className="strikethrough">{originalTotal.toLocaleString()} ₽</span>
                            </div>
                        </>
                    )}
                    
                    <div className="summary-row">
                        <span>Общая сумма:</span>
                        <span className="total-amount">{finalTotal.toLocaleString()} ₽</span>
                    </div>
                    
                    <div className="form-group">
                        <label>Телефон для связи *</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+7 (999) 123-45-67"
                            required
                        />
                        {user?.phone && user.phone === phone && (
                            <span className="phone-info">
                                (телефон из вашего профиля)
                            </span>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleSubmitOrder}
                        className="cta-button"
                        disabled={isSubmitting || !phone.trim()}
                    >
                        {isSubmitting ? 'Оформление...' : 'Оформить заказ'}
                    </button>
                    
                    <p className="order-note">
                        После оформления заказа с вами свяжется наш сотрудник для подтверждения.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CartPage;