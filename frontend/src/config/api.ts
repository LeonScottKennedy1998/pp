const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const API_URLS = {
    AUTH: {
        REGISTER: `${API_BASE_URL}/auth/register`,
        LOGIN: `${API_BASE_URL}/auth/login`,
        PROFILE: `${API_BASE_URL}/auth/profile`,
        UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,
        CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
        FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
        RESET_PASSWORD: (token: string | undefined) => {
            if (!token) {
                throw new Error('Token is required');
            }
            return `${API_BASE_URL}/auth/reset-password/${token}`;
        },
        VALIDATE_RESET_TOKEN: (token: string) => `${API_BASE_URL}/auth/reset-password/${token}`,
        TWO_FACTOR_STATUS: `${API_BASE_URL}/auth/two-factor/status`,
        TWO_FACTOR_ENABLE: `${API_BASE_URL}/auth/two-factor/enable`,
        TWO_FACTOR_DISABLE: `${API_BASE_URL}/auth/two-factor/disable`,
        TWO_FACTOR_VERIFY: `${API_BASE_URL}/auth/two-factor/verify`,
        TWO_FACTOR_RESEND_CODE: `${API_BASE_URL}/auth/two-factor/resend-code`
    },
    
    PRODUCTS: {
        BASE: `${API_BASE_URL}/products`,
        ALL: `${API_BASE_URL}/products/admin/all`,
        BY_ID: (id: number | string) => `${API_BASE_URL}/products/${id}`,
        CATEGORIES: `${API_BASE_URL}/products/categories`,
        CREATE: `${API_BASE_URL}/products`,
        UPDATE: (id: number | string) => `${API_BASE_URL}/products/${id}`,
        TOGGLE_STATUS: (id: number | string, action: 'activate' | 'deactivate') => `${API_BASE_URL}/products/${id}/${action}`,
        BATCH: `${API_BASE_URL}/products/batch`
    },
    
    DISCOUNTS: {
        BASE: `${API_BASE_URL}/discounts`,
        PRODUCT_DISCOUNT: (productId: number | string) => `${API_BASE_URL}/discounts/product/${productId}`,
        REMOVE_PRODUCT_DISCOUNT: (productId: number | string) => `${API_BASE_URL}/discounts/product/${productId}`,
        
        RULES: `${API_BASE_URL}/discounts/rules`,
        RULE_BY_ID: (ruleId: number | string) => `${API_BASE_URL}/discounts/rules/${ruleId}`,
        APPLY_RULE: (ruleId: number | string) => `${API_BASE_URL}/discounts/rules/${ruleId}/apply`,
        TOGGLE_RULE: (ruleId: number | string) => `${API_BASE_URL}/discounts/rules/${ruleId}/toggle`,
        PREVIEW_RULE: (ruleId: number | string) => `${API_BASE_URL}/discounts/rules/${ruleId}/preview`,
        UPDATE_RULE: (ruleId: number | string) => `${API_BASE_URL}/discounts/rules/${ruleId}`,
        REMOVE_RULE_DISCOUNTS: (ruleId: number | string) => `${API_BASE_URL}/discounts/rules/${ruleId}/discounts`
    },
    
    ORDERS: {
        BASE: `${API_BASE_URL}/orders`,
        MY_ORDERS: `${API_BASE_URL}/orders/my-orders`,
        BY_ID: (id: number | string) => `${API_BASE_URL}/orders/${id}`,
        CREATE: `${API_BASE_URL}/orders`,
        
        ALL_ORDERS: `${API_BASE_URL}/orders/admin/all`,
        ADMIN_ORDER_DETAILS: (id: number | string) => `${API_BASE_URL}/orders/admin/${id}`,
        UPDATE_STATUS: (id: number | string) => `${API_BASE_URL}/orders/admin/${id}/status`
    },
    
    
    WISHLIST: {
        BASE: `${API_BASE_URL}/wishlist`,
        CHECK_PRODUCT: (productId: number | string) => `${API_BASE_URL}/wishlist/check/${productId}`,
        COUNT: `${API_BASE_URL}/wishlist/count`,
        BY_PRODUCT_ID: (productId: number | string) => `${API_BASE_URL}/wishlist/${productId}`
    },
    
    NOTIFICATIONS: {
        CHECK: `${API_BASE_URL}/wishlist-notifications/check`,
        STATS: `${API_BASE_URL}/wishlist-notifications/stats`
    },
    
    ANALYTICS: {
        DASHBOARD_STATS: `${API_BASE_URL}/analytics/dashboard-stats`,
        CHART_DATA: `${API_BASE_URL}/analytics/chart-data`,
        GENERATE_REPORT: `${API_BASE_URL}/analytics/generate-report`
    },
    
    AUDIT: {
        BASE: `${API_BASE_URL}/audit`,
        STATS: `${API_BASE_URL}/audit/stats`,
        ACTIONS: `${API_BASE_URL}/audit/actions`,
        TABLES: `${API_BASE_URL}/audit/tables`
    },
    
    BACKUPS: {
        BASE: `${API_BASE_URL}/backup`,
        STATS: `${API_BASE_URL}/backup/stats`,
        SQL_BACKUP: `${API_BASE_URL}/backup/sql`,
        RESTORE: (filename: string) => `${API_BASE_URL}/backup/restore/${filename}`,
        DOWNLOAD: (filename: string) => `${API_BASE_URL}/backup/download/${filename}`,
        DELETE: (filename: string) => `${API_BASE_URL}/backup/${filename}`,
    },
    
    USERS: {
        BASE: `${API_BASE_URL}/users`,
        BY_ID: (id: number | string) => `${API_BASE_URL}/users/${id}`,
        RESET_PASSWORD: (id: number | string) => `${API_BASE_URL}/users/${id}/reset-password`,
        TOGGLE_BLOCK: (id: number | string, action: 'block' | 'unblock') => `${API_BASE_URL}/users/${id}/${action}`
    },
    
    PROCUREMENT: {
        SUPPLIERS: `${API_BASE_URL}/procurement/suppliers`,
        SUPPLIER_BY_ID: (supplierId: number | string) => `${API_BASE_URL}/procurement/suppliers/${supplierId}`,
        
        ORDERS: `${API_BASE_URL}/procurement/orders`,
        ORDER_BY_ID: (poId: number | string) => `${API_BASE_URL}/procurement/orders/${poId}`,
        UPDATE_ORDER_STATUS: (poId: number | string) => `${API_BASE_URL}/procurement/orders/${poId}/status`,
        
        STOCK_ANALYSIS: `${API_BASE_URL}/procurement/stock-analysis`,
        RECOMMENDATIONS: `${API_BASE_URL}/procurement/recommendations`,
        DELIVERY_STATUSES: `${API_BASE_URL}/procurement/delivery-statuses`,
        REPORTS: `${API_BASE_URL}/procurement/reports`
    },
    PERFORMANCE: {
        DASHBOARD_STATS: `${API_BASE_URL}/performance/dashboard-stats`,
        REALTIME: `${API_BASE_URL}/performance/realtime`,
        CLEAR_OLD: `${API_BASE_URL}/performance/clear-old`
    },
};

export const API_BASE = API_BASE_URL;
export const API_URL = API_BASE_URL;

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const getHeaders = (additionalHeaders = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...additionalHeaders
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

export const handleApiError = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
};