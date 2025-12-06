import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export function OAuthCallbackHandler() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code || !state) {
          setError('Missing authorization code or state parameter');
          return;
        }

        console.log('🔐 Processing Stepik OAuth callback...');

        // Get token and call backend callback endpoint
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        // Call backend callback with code
        const response = await fetch(`/api/stepik/callback?code=${code}&state=${state}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ OAuth callback successful', result);
          
          // Redirect to settings with success
          setLocation('/settings?tab=platforms&success=connected');
        } else {
          const error = await response.json();
          setError(error.message || 'OAuth callback failed');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message);
      }
    };

    handleCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Ошибка подключения</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/settings"
            className="block text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Вернуться в настройки
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Подключение к Stepik...</p>
      </div>
    </div>
  );
}
