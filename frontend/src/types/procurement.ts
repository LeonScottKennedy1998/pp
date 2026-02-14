export interface Supplier {
    supplier_id: number;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    rating: number;
    is_active: boolean;
    created_at: string;
    total_orders?: number;
    total_spent?: number;
}

export interface PurchaseOrder {
    po_id: number;
    supplier_id: number;
    manager_id: number;
    delivery_status_id: number;
    total_amount: number | null;
    rating: number | null;
    created_at: string;
    updated_at: string;
    supplier_name: string;
    contact_person: string | null;
    supplier_email: string | null;
    supplier_phone: string | null;
    status_name: string;
    manager_name: string;
    items_count: number;
}

export interface PurchaseOrderItem {
    poi_id: number;
    purchase_order_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    product_name: string;
    image_url: string | null;
    current_stock: number;
    category_name: string;
    item_total: number;
}

export interface DeliveryStatus {
    status_id: number;
    status_name: string;
}

export interface StockAnalytics {
    low_stock: Array<{
        product_id: number;
        product_name: string;
        price: number;
        stock: number;
        category_name: string;
        last_month_ordered: number;
    }>;
    popular_items: Array<{
        product_id: number;
        product_name: string;
        category_name: string;
        times_ordered: number;
        total_ordered: number;
        avg_price: number;
    }>;
    statistics: {
        total_products: number;
        total_stock: number;
        critical_items: number;
        low_items: number;
        high_stock_items: number;
        active_orders: number;
    };
}

export interface ProductWithStock {
    product_id: number;
    product_name: string;
    description: string;
    price: number;
    stock: number;
    image_url: string | null;
    category_id: number;
    is_active: boolean;
    category_name: string;
    on_order: number;
}