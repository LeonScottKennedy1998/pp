import React, { useState, useEffect } from 'react';
import { Product } from '../../types/product';
import './ProductCard.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

interface ProductCardProps {
    product: Product;
    showWishlistButton?: boolean;
    showAddToCartButton?: boolean;
    showCategory?: boolean;
    showDescription?: boolean;
    onAddToCart?: (product: Product) => void;
    onViewDetails?: (product: Product) => void;
    onToggleWishlist?: (productId: number, isInWishlist: boolean) => Promise<void>;
    isInWishlist?: boolean;
    className?: string;
    layout?: 'grid' | 'list';
    showAlert?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    showWishlistButton = true,
    showAddToCartButton = true,
    showCategory = true,
    showDescription = true,
    onAddToCart,
    onViewDetails,
    onToggleWishlist,
    isInWishlist: externalIsInWishlist,
    className = '',
    layout = 'grid',
    showAlert = true
}) => {
    const [internalIsInWishlist, setInternalIsInWishlist] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const isInWishlist = externalIsInWishlist !== undefined 
        ? externalIsInWishlist 
        : internalIsInWishlist;

    useEffect(() => {
        if (showWishlistButton && !externalIsInWishlist) {
            checkWishlistStatus();
        }
    }, [product.id]);

    const checkWishlistStatus = async () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token || user.role !== 'Клиент') return;

        try {
            const response = await fetch(API_URLS.WISHLIST.CHECK_PRODUCT(product.id), {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setInternalIsInWishlist(data.isInWishlist);
            }
        } catch (error) {
            console.error('Ошибка проверки избранного:', error);
        }
    };

    const handleWishlistToggle = async () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token) {
            alert('Для добавления в избранное необходимо войти в систему');
            return;
        }

        if (user.role !== 'Клиент') {
            alert('Только клиенты могут добавлять товары в избранное');
            return;
        }

        setIsLoading(true);

        try {
            if (onToggleWishlist) {
                await onToggleWishlist(product.id, !isInWishlist);
                if (externalIsInWishlist === undefined) {
                    setInternalIsInWishlist(!isInWishlist);
                }
            } else {
                if (isInWishlist) {
                    await fetch(API_URLS.WISHLIST.BY_PRODUCT_ID(product.id), {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    if (showAlert) alert(`Товар "${product.name}" удален из избранного`);
                } else {
                    await fetch(API_URLS.WISHLIST.BASE, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ productId: product.id })
                    });
                    if (showAlert) alert(`Товар "${product.name}" добавлен в избранное!`);
                }
                setInternalIsInWishlist(!isInWishlist);
            }
        } catch (error) {
            console.error('Ошибка обновления избранного:', error);
            alert('Ошибка при обновлении избранного');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = () => {
        if (onViewDetails) {
            onViewDetails(product);
        }
    };

    const handleAddToCart = () => {
        if (onAddToCart) {
            onAddToCart(product);
            if (showAlert) {
                alert(`Товар "${product.name}" добавлен в корзину!`);
            }
        }
    };

    return (
        <div className={`product-card ${className} ${layout}`}>
            {showWishlistButton && (
                <div className="product-card-header">
                    <button 
                        className={`wishlist-btn ${isInWishlist ? 'active' : ''}`}
                        onClick={handleWishlistToggle}
                        disabled={isLoading}
                        title={isInWishlist ? "Удалить из избранного" : "Добавить в избранное"}
                    >
                        {isLoading ? '...' : (isInWishlist ? '❤️' : '🤍')}
                    </button>
                </div>
            )}
            
            <div className="product-image" onClick={handleViewDetails}>
                {product.image_url ? (
                    <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="product-img"
                    />
                ) : (
                    <div className="image-placeholder">
                        {product.name.charAt(0)}
                    </div>
                )}
            </div>
            
            <div className="product-content">
                <h3 onClick={handleViewDetails} className="product-title">
                    {product.name}
                </h3>
                
                {showCategory && (
                    <p className="product-category">{product.category}</p>
                )}
                
                {showDescription && (
                    <div className="product-description">
                        {product.description}
                    </div>
                )}
                
                <div className="product-footer">
                    <div className="price-stock">
                        <div className="price-container">
                            {product.has_discount ? (
                                <div className="price-with-discount">
                                    <span className="original-price">
                                        {product.price.toLocaleString()} ₽
                                    </span>
                                    <span className="final-price">
                                        {product.final_price?.toLocaleString()} ₽
                                    </span>
                                    <span className="discount-percent-badge">
                                        -{product.discount_percent}%
                                    </span>
                                </div>
                            ) : (
                                <span className="product-price">
                                    {product.price.toLocaleString()} ₽
                                </span>
                            )}
                        </div>
                        <span className={`product-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                            {product.stock > 0 ? 'В наличии' : 'Нет в наличии'}
                        </span>
                    </div>
                    
                    {showAddToCartButton && onAddToCart && (
                        <button 
                            onClick={handleAddToCart}
                            className="add-to-cart-btn"
                            disabled={product.stock === 0}
                        >
                            🛒 В корзину
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;