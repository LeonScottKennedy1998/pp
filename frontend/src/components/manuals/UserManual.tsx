import React, { useState, useEffect } from 'react';
import './UserManual.css';

const UserManual = () => {
    const [user, setUser] = useState<any>(null);
    const [pdfError, setPdfError] = useState(false);
    
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);
    
    const role = user?.role || 'Гость';
    
    const manuals = {
        'Клиент': '/manuals/client_manual.pdf',
        'Товаровед': '/manuals/merchandiser_manual.pdf',
        'Менеджер по закупкам': '/manuals/procurement_manual.pdf',
        'Аналитик': '/manuals/analyst_manual.pdf',
        'Администратор': '/manuals/admin_manual.pdf'
    };
    
    const currentManual = manuals[role as keyof typeof manuals] || '/manuals/client_manual.pdf';

    const handlePdfError = () => {
        setPdfError(true);
    };

    // Определяем мобильное устройство
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    return (
        <div className="page user-manual-page">
            <h1>Руководство пользователя</h1>
            <p className="page-subtitle">Добро пожаловать в систему! Вы вошли как: <strong>{role}</strong></p>
            
            <div className="manual-content">
                <div className="manual-header">
                    <div className="role-info">
                        <h2>Для вашей роли доступно руководство:</h2>
                        <div className="role-badge">{role}</div>
                    </div>
                    
                    <div className="download-section">
                        <a 
                            href={currentManual} 
                            download 
                            className="download-btn"
                        >
                            📥 Скачать PDF
                        </a>
                        <p className="help-text">Рекомендуется скачать руководство для оффлайн использования</p>
                    </div>
                </div>
                
                {pdfError ? (
                    <div className="pdf-fallback">
                        <p>Не удалось отобразить PDF в браузере.</p>
                        <div className="fallback-options">
                            <a 
                                href={currentManual} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="fallback-btn"
                            >
                                📄 Открыть в новой вкладке
                            </a>
                            <a 
                                href={currentManual} 
                                download 
                                className="fallback-btn download"
                            >
                                📥 Скачать для просмотра
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="pdf-container">
                        {isMobile ? (
                            // Для мобильных используем object с дополнительными параметрами
                            <object
                                data={`${currentManual}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                                type="application/pdf"
                                className="pdf-viewer"
                                onError={handlePdfError}
                            >
                                <div className="pdf-mobile-fallback">
                                    <p>На мобильных устройствах рекомендуется открыть PDF в новой вкладке</p>
                                    <a 
                                        href={currentManual} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mobile-open-btn"
                                    >
                                        📄 Открыть PDF
                                    </a>
                                    <a 
                                        href={currentManual} 
                                        download 
                                        className="mobile-download-btn"
                                    >
                                        📥 Скачать PDF
                                    </a>
                                </div>
                            </object>
                        ) : (
                            // Для десктопа оставляем iframe
                            <iframe 
                                src={`${currentManual}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                                title="Руководство пользователя"
                                className="pdf-viewer"
                                onError={handlePdfError}
                            >
                                <p>Ваш браузер не поддерживает отображение PDF. 
                                <a href={currentManual}>Скачайте руководство</a> для просмотра.</p>
                            </iframe>
                        )}
                    </div>
                )}
                

            </div>
        </div>
    );
};

export default UserManual;