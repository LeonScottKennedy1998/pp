// src/components/common/ProductModal.tsx
import React from 'react';
import { Product } from '../../types/product';
import './ProductModal.css';

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ 
    product, 
    isOpen, 
    onClose, 
    onAddToCart 
}) => {
    if (!isOpen || !product) return null;

    const hasDiscount = product.has_discount && product.discount_percent && product.discount_percent > 0;
    const finalPrice = hasDiscount && product.final_price ? product.final_price : product.price;
    const discountPercent = product.discount_percent || 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    ✕
                </button>
                
                <div className="product-modal">
                    <div className="product-modal-image">
                        {product.image_url ? (
                            <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="modal-img"
                            />
                        ) : (
                            <div className="modal-image-placeholder">
                                <span>{product.name.charAt(0)}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="product-modal-info">
                        <h2>{product.name}</h2>
                        <div className="modal-category">
                            Категория: <strong>{product.category}</strong>
                        </div>
                        
                        <div className="modal-description">
                            <h3>Описание</h3>
                            <p>{product.description || 'Описание отсутствует'}</p>
                        </div>
                        
                        <div className="modal-details">
                            <div className="detail-row">
                                <span>Цена:</span>
                                <div className="modal-price-container">
                                    {hasDiscount ? (
                                        <div className="discount-price-block">
                                            <span className="modal-original-price">
                                                {product.price.toLocaleString()} ₽
                                            </span>
                                            <span className="modal-final-price">
                                                {finalPrice.toLocaleString()} ₽
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="modal-price-normal">
                                            {product.price.toLocaleString()} ₽
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="detail-row">
                                <span>В наличии:</span>
                                <span className={`modal-stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                    {product.stock > 0 ? `${product.stock} шт.` : 'Нет в наличии'}
                                </span>
                            </div>
                            
                            {hasDiscount && (
                                <div className="detail-row">
                                    <span>Скидка:</span>
                                    <span className="discount-text">
                                        -{discountPercent}%
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                onClick={() => {
                                    onAddToCart(product);
                                    onClose();
                                }}
                                className="modal-add-to-cart-btn"
                                disabled={product.stock === 0}
                            >
                                {product.stock === 0 ? 'Товар закончился' : 'Добавить в корзину'}
                            </button>
                            <button onClick={onClose} className="modal-close-action-btn">
                                Вернуться в каталог
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;