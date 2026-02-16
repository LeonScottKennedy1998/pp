import React, { useState, useEffect } from 'react';
import './Profile.css';
import { API_URLS, getAuthHeaders } from '../../config/api';

const TwoFactorSettings: React.FC = () => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [verificationStep, setVerificationStep] = useState<'none' | 'pending' | 'verifying'>('none');
    const [verificationCode, setVerificationCode] = useState('');
    const [timer, setTimer] = useState(600);

    useEffect(() => {
        checkTwoFactorStatus();
    }, []);

    useEffect(() => {
        if (verificationStep === 'pending' && timer > 0) {
            const interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [verificationStep, timer]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const checkTwoFactorStatus = async () => {
        
        try {
            const response = await fetch(API_URLS.AUTH.TWO_FACTOR_STATUS, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                setTwoFactorEnabled(data.two_factor_enabled);
            }
        } catch (error) {
            console.error('Ошибка проверки статуса 2FA:', error);
        }
    };

    const handleEnableTwoFactor = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
                
        try {
            const response = await fetch(API_URLS.AUTH.TWO_FACTOR_ENABLE, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка включения 2FA');
            }
            
            setVerificationStep('pending');
            setTimer(600);
            setSuccess('Код подтверждения отправлен на вашу почту!');
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        setLoading(true);
        setError('');
                
        try {
            const response = await fetch(API_URLS.AUTH.TWO_FACTOR_VERIFY, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ code: verificationCode })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка проверки кода');
            }
            
            setTwoFactorEnabled(true);
            setVerificationStep('none');
            setVerificationCode('');
            setSuccess('Двухфакторная аутентификация успешно включена!');
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisableTwoFactor = async () => {
        if (!window.confirm('Вы уверены, что хотите отключить двухфакторную аутентификацию? Это снизит безопасность вашего аккаунта.')) {
            return;
        }
        
        setLoading(true);
        setError('');
                
        try {
            const response = await fetch(API_URLS.AUTH.TWO_FACTOR_DISABLE, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отключения 2FA');
            }
            
            setTwoFactorEnabled(false);
            setSuccess('Двухфакторная аутентификация отключена');
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
                
        try {
            const response = await fetch(API_URLS.AUTH.TWO_FACTOR_RESEND_CODE, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отправки кода');
            }
            
            setTimer(600);
            setSuccess('Новый код отправлен на вашу почту!');
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelVerification = () => {
        setVerificationStep('none');
        setVerificationCode('');
        setError('');
        setSuccess('');
    };

    return (
        <div className="two-factor-settings">
            <div className="section-header">
                <h3>🔒 Двухфакторная аутентификация</h3>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="two-factor-status">
                <div className="status-indicator">
                    <span className={`status-dot ${twoFactorEnabled ? 'enabled' : 'disabled'}`}></span>
                    <span className="status-text">
                        <strong>Статус:</strong>{' '}
                        <span className={`status-label ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                            {twoFactorEnabled ? 'Включена ✅' : 'Выключена ❌'}
                        </span>
                    </span>
                </div>
                
                <div className="two-factor-description">
                    <p>
                        <strong>Что такое двухфакторная аутентификация?</strong>
                    </p>
                    <p>
                        Это дополнительный уровень безопасности вашего аккаунта. 
                        При включённой 2FA после ввода пароля потребуется ввести код, 
                        отправленный на вашу почту.
                    </p>
                    <ul>
                        <li>✅ Защита от несанкционированного доступа</li>
                        <li>✅ Безопасность даже при утечке пароля</li>
                        <li>✅ Код действителен 10 минут</li>
                    </ul>
                </div>
            </div>
            
            {verificationStep === 'none' ? (
                <div className="two-factor-actions">
                    {!twoFactorEnabled ? (
                        <button 
                            onClick={handleEnableTwoFactor}
                            className="cta-button"
                            disabled={loading}
                        >
                            {loading ? 'Отправка кода...' : 'Включить 2FA'}
                        </button>
                    ) : (
                        <button 
                            onClick={handleDisableTwoFactor}
                            className="secondary-button danger"
                            disabled={loading}
                        >
                            {loading ? 'Обработка...' : 'Отключить 2FA'}
                        </button>
                    )}
                </div>
            ) : verificationStep === 'pending' ? (
                <div className="verification-step">
                    <div className="verification-header">
                        <h4>📧 Подтверждение включения 2FA</h4>
                        <p className="verification-info">
                            Мы отправили 6-значный код на вашу почту. 
                            Введите его ниже для подтверждения.
                        </p>
                        <div className="timer-display">
                            <span className="timer-label">⏳ Время на ввод кода:</span>
                            <span className={`timer ${timer < 60 ? 'warning' : ''}`}>
                                {formatTime(timer)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="verification-form">
                        <div className="form-group">
                            <label>Код подтверждения *</label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="123456"
                                maxLength={6}
                                pattern="[0-9]{6}"
                                disabled={loading || timer <= 0}
                                className="code-input"
                            />
                            <small>Введите 6 цифр из письма</small>
                        </div>
                        
                        <div className="verification-actions">
                            <div className="action-buttons">
                                <button 
                                    onClick={handleVerifyCode}
                                    className="cta-button"
                                    disabled={loading || verificationCode.length !== 6 || timer <= 0}
                                >
                                    {loading ? 'Проверка...' : 'Подтвердить'}
                                </button>
                                
                                <button 
                                    onClick={handleResendCode}
                                    className="secondary-button"
                                    disabled={loading || timer > 0}
                                >
                                    Отправить новый код
                                </button>
                            </div>
                            
                            <button 
                                onClick={handleCancelVerification}
                                className="text-button"
                                disabled={loading}
                            >
                                ← Отменить настройку 2FA
                            </button>
                        </div>
                    </div>
                    
                    {timer <= 0 && (
                        <div className="timer-expired">
                            <div className="expired-alert">
                                <p>⏰ <strong>Срок действия кода истёк</strong></p>
                                <p>Запросите новый код кнопкой выше</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default TwoFactorSettings;