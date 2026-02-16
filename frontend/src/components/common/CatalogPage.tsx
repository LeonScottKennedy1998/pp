import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import { Product } from '../../types/product';
import { API_URLS, getAuthHeaders } from '../../config/api';
import './CatalogPage.css';

const CatalogPage = ({ addToCart }: { addToCart: (product: any) => void }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<{ category_id: number; category_name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    useEffect(() => {
        let filtered = [...products];
        
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(product => product.category === selectedCategory);
        }
        
        switch (sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => {
                    if (!a.created_at || !b.created_at) return 0;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                break;
        }
        
        setFilteredProducts(filtered);
    }, [products, selectedCategory, sortBy]);

    const fetchProducts = async () => {
        try {
            const response = await fetch(API_URLS.PRODUCTS.BASE, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setProducts(data);
            setFilteredProducts(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(API_URLS.PRODUCTS.CATEGORIES);
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
    };

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSortBy(e.target.value);
    };

    const clearFilters = () => {
        setSelectedCategory('all');
        setSortBy('newest');
    };

    const handleViewDetails = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    if (loading) {
        return (
            <div className="page">
                <h1>Каталог товаров</h1>
                <div className="loading">Загрузка товаров...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page">
                <h1>Каталог товаров</h1>
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="page catalog-page">
            <h1>Каталог товаров</h1>
            <p className="page-subtitle">Товары с символикой Московского Приборостроительного Техникума</p>
            
            <div className="catalog-controls">
                <div className="filters">
                    <div className="filter-group">
                        <h3>Категории</h3>
                        <div className="category-buttons">
                            <button
                                className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                                onClick={() => handleCategoryChange('all')}
                            >
                                Все товары
                            </button>
                            {categories.map(category => (
                                <button
                                    key={category.category_id}
                                    className={`category-btn ${selectedCategory === category.category_name ? 'active' : ''}`}
                                    onClick={() => handleCategoryChange(category.category_name)}
                                >
                                    {category.category_name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="filter-group">
                        <h3>Сортировка</h3>
                        <select 
                            value={sortBy} 
                            onChange={handleSortChange}
                            className="sort-select"
                        >
                            <option value="newest">Сначала новые</option>
                            <option value="price-asc">Цена: по возрастанию</option>
                            <option value="price-desc">Цена: по убыванию</option>
                            <option value="name-asc">Название: А-Я</option>
                            <option value="name-desc">Название: Я-А</option>
                        </select>
                    </div>
                </div>
                
                <div className="filter-info">
                    <span>
                        Найдено товаров: <strong>{filteredProducts.length}</strong>
                        {selectedCategory !== 'all' && ` в категории "${selectedCategory}"`}
                    </span>
                    {(selectedCategory !== 'all' || sortBy !== 'newest') && (
                        <button onClick={clearFilters} className="clear-filters-btn">
                            Сбросить фильтры
                        </button>
                    )}
                </div>
            </div>
            
            {filteredProducts.length === 0 ? (
                <div className="empty-catalog">
                    <p>Товаров не найдено</p>
                    <button onClick={clearFilters} className="cta-button">
                        Показать все товары
                    </button>
                </div>
            ) : (
                <div className="products-grid">
                    {filteredProducts.map(product => (
                        <ProductCard 
                            key={product.id} 
                            product={product} 
                            onAddToCart={addToCart}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </div>
            )}

            <ProductModal
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddToCart={addToCart}
            />
        </div>
    );
};

export default CatalogPage;