export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    image_url?: string;
    category: string;
    created_at: string;
    is_active: boolean;
    discount_percent?: number;
    has_discount?: boolean;
    final_price?: number;
    original_price?: number;
    discount_end_date?: string;
    rule_id?: number;
}

export interface DiscountRule {
    rule_id: number;
    rule_name: string;
    rule_type: 'category' | 'stock' | 'age' | 'price_range' | 'seasonal' | 'new_arrivals';
    condition_value: any;
    discount_percent: number;
    priority: number;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    created_at: string;
    last_applied?: string;
    status: string;
    applied_count?: number;
}

export interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: number;
    total: number;
    status: string;
    created_at: string;
    items: Array<{
        product_name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
}

export interface Category {
    category_id: number;
    category_name: string;
}

export interface WishlistItem extends Product {
    wishlist_id: number;
    added_at: string;
}