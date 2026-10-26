import { useState } from 'react';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { isValidInternationalPhone, normalizePhone } from '../utils/phoneUtils';
import { countryOptions, guessCountry } from '../utils/countries';
import { useLang } from '../i18n';

// Буквы и прочие символы любого алфавита (é, ü, ñ — буквы, а не символы)
const LETTER = new RegExp('\\p{L}', 'u');
const SYMBOL = new RegExp('[^\\p{L}\\p{N}]', 'u');

export function AuthForm({ onAuthSuccess, initialMode = 'login' }: any) {
  const [mode, setMode] = useState(initialMode);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const { m, lang } = useLang();
  const a = m.auth;
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', country: guessCountry()
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
        identifier = normalizePhone(identifier);
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
          ? a.reset.sentEmail
          : a.reset.sentSms);
      } else {
        setResetStep('verify');
        setResetMessage(a.reset.sentMaybe);
      }
    } catch {
      setResetError(a.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: any) => {
    e.preventDefault();
    if (!resetUserId) { setResetError(a.reset.noUser); return; }
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
        setResetError(data.message || a.reset.badCode);
      }
    } catch {
      setResetError(a.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: any) => {
    e.preventDefault();
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError(a.reset.mismatch); return;
    }
    if (resetForm.newPassword.length < 8) {
      setResetError(a.reset.tooShort); return;
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
        alert(a.reset.done);
      } else {
        setResetError(data.message || a.reset.failed);
      }
    } catch {
      setResetError(a.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  // Для сброса пароля сервер требует 8+ символов
  const getPasswordRequirements = (password: string) => {
    return [
      { label: a.rules.min8, met: password.length >= 8 },
      { label: a.rules.digits, met: /[0-9]/.test(password) },
      { label: a.rules.letters, met: LETTER.test(password) },
      { label: a.rules.symbols, met: SYMBOL.test(password) }
    ];
  };

  // Для регистрации — те же правила, что проверяет сервер (validationRules.password)
  const getRegisterPasswordRequirements = (password: string) => {
    return [
      { label: a.rules.min12, met: password.length >= 12 },
      { label: a.rules.upper, met: /[A-Z]/.test(password) },
      { label: a.rules.lower, met: /[a-z]/.test(password) },
      { label: a.rules.digit, met: /[0-9]/.test(password) },
      { label: a.rules.special, met: /[!@#$%^&*]/.test(password) }
    ];
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let identifier = loginForm.identifier;
      
      // Если введён номер телефона, приводим его к международному формату
      if (identifier && !identifier.includes('@')) {
        identifier = normalizePhone(identifier);
        if (!isValidInternationalPhone(identifier)) {
          alert(a.badPhone);
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
        alert(errorData.message || a.loginFailed);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(a.loginError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    if (!consentAccepted) {
      alert(a.consentRequired);
      return;
    }
    setIsLoading(true);

    try {
      // Телефон необязателен; если указан — в международном формате
      const formattedPhone = normalizePhone(registerForm.phone);
      if (formattedPhone && !isValidInternationalPhone(formattedPhone)) {
        alert(a.badRegisterPhone);
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
          phone: formattedPhone || undefined,
          country: registerForm.country || undefined,
          language: lang,
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
        // данные ученика этой страны хранятся в другом региональном контуре — регистрация там
        if (response.status === 409 && errorData.code === 'region_redirect' && /^https:\/\//.test(errorData.url || '')) {
          const go = window.confirm(a.regionRedirect(errorData.url));
          if (go) window.location.href = errorData.url;
          return;
        }
        alert(errorData.message || a.registerFailed);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(a.registerError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginIdentifierChange = (e: any) => {
    setLoginForm(prev => ({ ...prev, identifier: e.target.value }));
  };

  const handleRegisterPhoneChange = (e: any) => {
    setRegisterForm(prev => ({ ...prev, phone: e.target.value }));
  };

  const countries = countryOptions(lang);

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
            My EPA
          </h1>
          <p style={{ 
            margin: '0', 
            fontSize: '16px', 
            opacity: '0.9',
            fontWeight: '400'
          }}>
            {a.tagline}
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
            {a.loginTab}
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
            {a.registerTab}
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          {/* ======= FORGOT PASSWORD FLOW ======= */}
          {resetStep !== 'idle' && mode === 'login' ? (
            <div>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>
                  {resetStep === 'request' && a.reset.title}
                  {resetStep === 'verify' && a.reset.enterCode}
                  {resetStep === 'new-password' && a.reset.newPassword}
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
                      {a.identifier}
                    </label>
                    <input
                      type="text"
                      value={resetForm.identifier}
                      onChange={(e) => setResetForm(p => ({ ...p, identifier: e.target.value }))}
                      placeholder={a.identifierPlaceholder}
                      required
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => e.target.style.borderColor = '#007bff'}
                      onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      {a.reset.method}
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(['email', 'sms'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setResetForm(p => ({ ...p, method }))}
                          style={{
                            flex: 1, padding: '10px', border: `2px solid ${resetForm.method === method ? '#667eea' : '#e9ecef'}`,
                            borderRadius: '8px', background: resetForm.method === method ? '#f0f0ff' : 'white',
                            color: resetForm.method === method ? '#667eea' : '#6c757d', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                          }}
                        >
                          {method === 'email' ? a.email : 'SMS'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? a.reset.sending : a.reset.send}
                  </button>
                </form>
              )}

              {/* Step 2: Enter code */}
              {resetStep === 'verify' && (
                <form onSubmit={handleVerifyCode}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>
                      {resetForm.method === 'email' ? a.reset.codeEmail : a.reset.codeSms}
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
                    {isLoading ? a.reset.checking : a.reset.confirm}
                  </button>
                  <button type="button" onClick={() => setResetStep('request')} style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'none', border: '1px solid #e9ecef', borderRadius: '8px', fontSize: '14px', color: '#6c757d', cursor: 'pointer' }}>
                    ← {a.reset.resend}
                  </button>
                </form>
              )}

              {/* Step 3: New password */}
              {resetStep === 'new-password' && (
                <form onSubmit={handleResetPassword}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>{a.reset.newPassword}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder={a.reset.min8}
                        required
                        style={{ width: '100%', padding: '12px 50px 12px 16px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = '#007bff'}
                        onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#6c757d' }}>
                        {showNewPassword ? <EyeOff size={18} aria-label={a.hidePassword} /> : <Eye size={18} aria-label={a.showPassword} />}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {getPasswordRequirements(resetForm.newPassword).map((req, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: req.met ? '#e8f5e9' : '#f8f9fa', color: req.met ? '#2e7d32' : '#9e9e9e', border: `1px solid ${req.met ? '#c8e6c9' : '#e0e0e0'}`, transition: 'all 0.3s' }}>
                          {req.met ? <Check size={12} /> : <Circle size={12} />} {req.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#333' }}>{a.reset.repeat}</label>
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder={a.reset.repeat}
                      required
                      style={{ width: '100%', padding: '12px 16px', border: `2px solid ${resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword ? '#dc3545' : '#e9ecef'}`, borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {resetForm.confirmPassword && resetForm.newPassword !== resetForm.confirmPassword && (
                      <p style={{ color: '#dc3545', fontSize: '12px', margin: '4px 0 0' }}>{a.reset.mismatch}</p>
                    )}
                  </div>
                  <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #28a745 0%, #218838 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? m.common.saving : a.reset.savePassword}
                  </button>
                </form>
              )}

              {/* Cancel link */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" onClick={() => { setResetStep('idle'); setResetError(''); setResetMessage(''); }} style={{ background: 'none', border: 'none', color: '#6c757d', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                  ← {a.reset.back}
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
                  {a.identifier}
                </label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={handleLoginIdentifierChange}
                  placeholder={a.identifierPlaceholder}
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
                  {a.password}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={a.passwordPlaceholder}
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
                    {showLoginPassword ? <EyeOff size={18} aria-label={a.hidePassword} /> : <Eye size={18} aria-label={a.showPassword} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '16px', marginTop: '-8px' }}>
                <button
                  type="button"
                  onClick={() => { setResetStep('request'); setResetError(''); setResetMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#667eea', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  {a.forgot}
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
                {isLoading ? a.loggingIn : a.login}
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
                  {a.firstName}
                </label>
                <input
                  type="text"
                  value={registerForm.firstName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder={a.firstNamePlaceholder}
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
                  {a.lastName}
                </label>
                <input
                  type="text"
                  value={registerForm.lastName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder={a.lastNamePlaceholder}
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
                  {a.email}
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
                  {a.phoneOptional}
                </label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={handleRegisterPhoneChange}
                  placeholder={a.phonePlaceholder}
                  autoComplete="tel"
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

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="register-country" style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  {a.country}
                </label>
                <select
                  id="register-country"
                  value={registerForm.country}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, country: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  data-testid="select-register-country"
                >
                  <option value="" disabled>{a.chooseCountry}</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6c757d' }}>
                  {a.countryHint}
                </p>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  {a.password}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={a.newPasswordPlaceholder}
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
                    {showRegisterPassword ? <EyeOff size={18} aria-label={a.hidePassword} /> : <Eye size={18} aria-label={a.showPassword} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                <div style={{ 
                  marginTop: '10px', 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px' 
                }}>
                  {getRegisterPasswordRequirements(registerForm.password).map((req, idx) => (
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
                      {req.met ? <Check size={12} /> : <Circle size={12} />} {req.label}
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#555', lineHeight: 1.4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  required
                  style={{ marginTop: '2px' }}
                  data-testid="checkbox-register-consent"
                />
                <span>
                  {a.consentPrefix} <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#5a67d8' }}>{a.consentTerms}</a>{' '}
                  {a.consentMiddle}{' '}
                  <a href="/consent" target="_blank" rel="noopener noreferrer" style={{ color: '#5a67d8' }}>{a.consentData}</a>{' '}
                  {a.consentUnder}{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#5a67d8' }}>{a.consentPrivacy}</a>
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading || !consentAccepted}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isLoading || !consentAccepted ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading || !consentAccepted ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                data-testid="button-submit-register"
              >
                {isLoading ? a.registering : a.register}
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
            <p style={{ margin: '0 0 8px 0' }}>
              {a.https}{' '}
              <a href="/security" target="_blank" rel="noopener noreferrer" style={{ color: '#5a67d8' }}>{a.howWeProtect}</a>
            </p>
            <p style={{ margin: '0', fontSize: '11px', opacity: '0.8' }}>
              {a.tagline}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}