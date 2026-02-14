import './UserManual.css';

const UserManual = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user?.role || 'Гость';
    
    const manuals = {
        'Клиент': '/manuals/client_manual.pdf',
        'Товаровед': '/manuals/merchandiser_manual.pdf',
        'Менеджер по закупкам': '/manuals/procurement_manual.pdf',
        'Аналитик': '/manuals/analyst_manual.pdf',
        'Администратор': '/manuals/admin_manual.pdf'
    };
    
    const currentManual = manuals[role as keyof typeof manuals] || '/manuals/client_manual.pdf';
    
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
                
                <div className="pdf-container">
                    <iframe 
                        src={currentManual} 
                        title="Руководство пользователя"
                        className="pdf-viewer"
                    >
                        <p>Ваш браузер не поддерживает отображение PDF. 
                        <a href={currentManual}>Скачайте руководство</a> для просмотра.</p>
                    </iframe>
                </div>
                
            </div>
        </div>
    );
};

export default UserManual;