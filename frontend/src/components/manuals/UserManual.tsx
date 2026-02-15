import React, { useState, useEffect } from 'react';
import './UserManual.css';

const UserManual = () => {
    const [user, setUser] = useState<any>(null);
    
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
                </div>
                
                {isMobile ? (
                    // Мобильная версия - только скачивание
                    <div className="mobile-pdf-section">
                        <div className="mobile-pdf-icon">📄</div>
                        <h3>Руководство пользователя для {role}</h3>
                        <p className="mobile-pdf-info">
                            Для просмотра руководства на мобильном устройстве 
                            необходимо скачать PDF-файл
                        </p>
                        
                        <div className="mobile-pdf-actions">
                            <a 
                                href={currentManual} 
                                download 
                                className="mobile-download-btn"
                            >
                                📥 Скачать руководство
                            </a>
                            <a 
                                href={currentManual} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mobile-open-btn"
                            >
                                📄 Открыть в браузере
                            </a>
                        </div>
                        
                        <p className="mobile-pdf-note">
                            После скачивания откройте файл в любом PDF-ридере на вашем устройстве
                        </p>
                    </div>
                ) : (
                    // Десктопная версия - PDF вьювер
                    <>
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
                        
                        <div className="pdf-container">
                            <iframe 
                                src={`${currentManual}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                                title="Руководство пользователя"
                                className="pdf-viewer"
                            >
                                <p>Ваш браузер не поддерживает отображение PDF. 
                                <a href={currentManual}>Скачайте руководство</a> для просмотра.</p>
                            </iframe>
                        </div>
                    </>
                )}
                
            </div>
        </div>
    );
};

export default UserManual;