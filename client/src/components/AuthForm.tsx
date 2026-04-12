import { useState } from 'react';
import { phoneMask, formatPhoneToInternational, validateRussianPhone } from '../utils/phoneUtils';

export function AuthForm({ onAuthSuccess }: any) {
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: ''
  });

  // Forgot password state
  const [resetStep, setResetStep] = useState<'idle' | 'request' | 'verify' | 'new-password'>('idle');
  const [resetForm, setResetForm] = useState({
    identifier: '',
    method: 'email' as 'email' | 'sms',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [resetUserId, setResetUserId] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const handleForgotPasswordRequest = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setResetError('');
    try {
      let identifier = resetForm.identifier;
      if (!identifier.includes('@')) {
        identifier = formatPhoneToInternational(identifier);
      }
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, method: resetForm.method }),
      });
      const data = await res.json();
      if (data.userId) {
        setResetUserId(data.userId);
        setResetStep('verify');
        setResetMessage(resetForm.method === 'email'
          ? 'Код отправлен на ваш email. Проверьте почту.'
          : 'Код отправлен по SMS на ваш номер телефона.');
      } else {
        setResetStep('verify');
        setResetMessage('Если аккаунт найден, код будет отправлен.');
      }
    } catch {
      setResetError('Ошибка соединения. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: any) => {
    e.preventDefault();
    if (!resetUserId) { setResetError('Не удалось определить пользователя.'); return; }
    setIsLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, code: resetForm.code }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetStep('new-password');
        setResetMessage('');
      } else {
        setResetError(data.message || 'Неверный код');
      }
    } catch {
      setResetError('Ошибка соединения. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: any) => {
    e.preventDefault();
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError('Пароли не совпадают'); return;
    }
    if (resetForm.newPassword.length < 8) {
      setResetError('Пароль должен быть не менее 8 символов'); return;
    }
    setIsLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, code: resetForm.code, newPassword: resetForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetStep('idle');
        setMode('login');
        setResetForm({ identifier: '', method: 'email', code: '', newPassword: '', confirmPassword: '' });
        alert('Пароль успешно изменён! Теперь войдите с новым паролем.');
      } else {
        setResetError(data.message || 'Ошибка сброса пароля');
      }
    } catch {
      setResetError('Ошибка соединения. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordRequirements = (password: string) => {
    return [
      { label: '8+ символов', met: password.length >= 8 },
      { label: 'Цифры', met: /[0-9]/.test(password) },
      { label: 'Буквы', met: /[a-zA-Zа-яА-Я]/.test(password) },
      { label: 'Символы', met: /[^a-zA-Zа-яА-Я0-9]/.test(password) }
    ];
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let identifier = loginForm.identifier;
      
      // Если введён номер телефона, форматируем его
      if (identifier && !identifier.includes('@')) {
        identifier = formatPhoneToInternational(identifier);
        
        // Валидируем российский номер
        if (!validateRussianPhone(identifier)) {
          alert('Введите корректный российский номер телефона');
          setIsLoading(false);
          return;
        }
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier,
          password: loginForm.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onAuthSuccess(data.user);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка входа');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert('Ошибка при входе в систему');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneToInternational(registerForm.phone);
      
      // Валидируем российский номер
      if (!validateRussianPhone(formattedPhone)) {
        alert('Введите корректный российский номер телефона');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: registerForm.firstName,
          lastName: registerForm.lastName,
          email: registerForm.email,
          phone: formattedPhone,
          password: registerForm.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onAuthSuccess(data.user);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка регистрации');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      alert('Ошибка при регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginIdentifierChange = (e: any) => {
    const value = e.target.value;
    const startsWithPhoneChar = /^[+\d]/.test(value);
    
    if (value.includes('@') || !startsWithPhoneChar) {
      setLoginForm(prev => ({ ...prev, identifier: value }));
    } else {
      const maskedPhone = phoneMask(value);
      setLoginForm(prev => ({ ...prev, identifier: maskedPhone }));
    }
  };

  const handleRegisterPhoneChange = (e: any) => {
    const maskedPhone = phoneMask(e.target.value);
    setRegisterForm(prev => ({ ...prev, phone: maskedPhone }));
  };

  const isEmailField = loginForm.identifier.includes('@');

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '30px 20px'
        }}>
          <h1 style={{ 
            margin: '0 0 10px 0', 
            fontSize: '28px', 
            fontWeight: '600',
            letterSpacing: '-0.5px'
          }}>
            💎 My EPA
          </h1>
          <p style={{ 
            margin: '0', 
            fontSize: '16px', 
            opacity: '0.9',
            fontWeight: '400'
          }}>
            Агрегатор Онлайн Обучения
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              backgroundColor: mode === 'login' ? '#f8f9fa' : 'white',
              color: mode === 'login' ? '#007bff' : '#6c757d',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            data-testid="button-login-tab"
          >
            🔑 Вход
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              backgroundColor: mode === 'register' ? '#f8f9fa' : 'white',
              color: mode === 'register' ? '#007bff' : '#6c757d',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              borderLeft: '1px solid #e9ecef',
              transition: 'all 0.2s ease'
            }}
            data-testid="button-register-tab"
          >
            ✨ Регистрация
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          {/* ======= FORGOT PASSWORD FLOW ======= */}
          {resetStep !== 'idle' && mode === 'login' ? (
            <div>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {resetStep === 'request' ? '🔑' : resetStep === 'verify' ? '📬' : '🔒'}
                </div>
                <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>
                  {resetStep === 'request' && 'Восстановление пароля'}
                  {resetStep === 'verify' && 'Введите код'}
                  {resetStep === 'new-password' && 'Новый пароль'}
                </h3>
                {resetMessage && (
                  <p style={{ color: '#28a745', fontSize: '13px', margin: '8px 0 0' }}>{resetMessage}</p>
                )}
                {resetError && (
                  <p style={{ color: '#dc3545', fontSize: '13px', margin: '8px 0 0' }}>{resetError}</p>
                )}
              </div>

              {/* Step 1: Enter identifier + choose method */}
              {resetStep === 'request' && (
                <form onSubmit={handleForgotPasswordRequest}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      📧 Email или 📱 Телефон
                    </label>
                    <input
                      type="text"
                      value={resetForm.identifier}
                      onChange={(e) => setResetForm(p => ({ ...p, identifier: e.target.value }))}
                      placeholder="user@example.com или +7 (___) ___-__-__"
                      required
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => e.target.style.borderColor = '#007bff'}
                      onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      Способ получения кода
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(['email', 'sms'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setResetForm(p => ({ ...p, method: m }))}
                          style={{
                            flex: 1, padding: '10px', border: `2px solid ${resetForm.method === m ? '#667eea' : '#e9ecef'}`,
                            borderRadius: '8px', background: resetForm.method === m ? '#f0f0ff' : 'white',
                            color: resetForm.method === m ? '#667eea' : '#6c757d', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                          }}
                        >
                          {m === 'email' ? '📧 Email' : '📱 SMS'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? '⏳ Отправка...' : '📨 Отправить код'}
                  </button>
                </form>
              )}

              {/* Step 2: Enter code */}
              {resetStep === 'verify' && (
                <form onSubmit={handleVerifyCode}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      Код из {resetForm.method === 'email' ? 'письма' : 'SMS'}
                    </label>
                    <input
                      type="text"
                      value={resetForm.code}
                      onChange={(e) => setResetForm(p => ({ ...p, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder="••••••"
                      maxLength={6}
                      required
                      style={{ width: '100%', padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '24px', textAlign: 'center', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => e.target.style.borderColor = '#007bff'}
                      onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                  </div>
                  <button type="submit" disabled={isLoading || resetForm.code.length < 6} style={{ width: '100%', padding: '12px', background: (isLoading || resetForm.code.length < 6) ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: (isLoading || resetForm.code.length < 6) ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? '⏳ Проверка...' : '✅ Подтвердить'}
                  </button>
                  <button type="button" onClick={() => setResetStep('request')} style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'none', border: '1px solid #e9ecef', borderRadius: '8px', fontSize: '14px', color: '#6c757d', cursor: 'pointer' }}>
                    ← Отправить код повторно
                  </button>
                </form>
              )}

              {/* Step 3: New password */}
              {resetStep === 'new-password' && (
                <form onSubmit={handleResetPassword}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>🔐 Новый пароль</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Минимум 8 символов"
                        required
                        style={{ width: '100%', padding: '12px 50px 12px 16px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = '#007bff'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#6c757d' }}>
                        {showNewPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {getPasswordRequirements(resetForm.newPassword).map((req, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: req.met ? '#e8f5e9' : '#f8f9fa', color: req.met ? '#2e7d32' : '#9e9e9e', border: `1px solid ${req.met ? '#c8e6c9' : '#e0e0e0'}`, transition: 'all 0.3s' }}>
                          {req.met ? '✅' : '⚪'} {req.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>🔐 Повторите пароль</label>
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Повторите пароль"
                      required
                      style={{ width: '100%', padding: '12px 16px', border: `2px solid ${resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword ? '#dc3545' : '#e9ecef'}`, borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
                      <p style={{ color: '#dc3545', fontSize: '12px', margin: '4px 0 0' }}>Пароли не совпадают</p>
                    )}
                  </div>
                  <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #28a745 0%, #218838 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? '⏳ Сохранение...' : '🔒 Сохранить пароль'}
                  </button>
                </form>
              )}

              {/* Cancel link */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" onClick={() => { setResetStep('idle'); setResetError(''); setResetMessage(''); }} style={{ background: 'none', border: 'none', color: '#6c757d', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                  ← Вернуться ко входу
                </button>
              </div>
            </div>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  📧 Email или 📱 Телефон
                </label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={handleLoginIdentifierChange}
                  placeholder={isEmailField ? 'user@example.com' : '+7 (___) ___-__-__'}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  data-testid="input-login-identifier"
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  🔐 Пароль
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Введите пароль"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 50px 12px 16px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    data-testid="input-login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      color: '#6c757d'
                    }}
                    data-testid="button-toggle-login-password"
                  >
                    {showLoginPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '16px', marginTop: '-8px' }}>
                <button
                  type="button"
                  onClick={() => { setResetStep('request'); setResetError(''); setResetMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#667eea', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Забыли пароль?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                data-testid="button-submit-login"
              >
                {isLoading ? '⏳ Вход...' : '🚀 Войти'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  👤 Имя
                </label>
                <input
                  type="text"
                  value={registerForm.firstName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Введите имя"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  data-testid="input-register-firstname"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  👨‍💼 Фамилия
                </label>
                <input
                  type="text"
                  value={registerForm.lastName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Введите фамилию"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  data-testid="input-register-lastname"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  📧 Email
                </label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  data-testid="input-register-email"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  📱 Телефон
                </label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={handleRegisterPhoneChange}
                  placeholder="+7 (___) ___-__-__"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  data-testid="input-register-phone"
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  🔐 Пароль
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Создайте надёжный пароль"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 50px 12px 16px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    data-testid="input-register-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      color: '#6c757d'
                    }}
                    data-testid="button-toggle-register-password"
                  >
                    {showRegisterPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                <div style={{ 
                  marginTop: '10px', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px' 
                }}>
                  {getPasswordRequirements(registerForm.password).map((req, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backgroundColor: req.met ? '#e8f5e9' : '#f8f9fa',
                        color: req.met ? '#2e7d32' : '#9e9e9e',
                        border: `1px solid ${req.met ? '#c8e6c9' : '#e0e0e0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {req.met ? '✅' : '⚪'} {req.label}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                data-testid="button-submit-register"
              >
                {isLoading ? '⏳ Регистрация...' : '🎉 Создать аккаунт'}
              </button>
            </form>
          )}

          {/* Footer */}
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #e9ecef',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6c757d'
          }}>
            <p style={{ margin: '0 0 5px 0' }}>
              🔒 Ваши данные надёжно защищены
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              Сертифицированная система безопасности
            </p>
            <p style={{ margin: '0', fontSize: '11px', opacity: '0.8' }}>
              Агрегатор Онлайн Обучения
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}