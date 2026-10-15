import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';

interface PlatformAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: { id: string; name: string } | null;
}

export function PlatformAuthModal({ open, onOpenChange, platform }: PlatformAuthModalProps) {
  const [authType, setAuthType] = useState<'username_password' | 'api_key' | 'oauth'>('username_password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setApiKey('');
    setError(null);
    setSuccess(false);
    setAuthType('username_password');
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authType === 'username_password' && (!username || !password)) {
        throw new Error('Заполните логин и пароль');
      }
      if (authType === 'api_key' && !apiKey) {
        throw new Error('Заполните API ключ');
      }

      const token = localStorage.getItem('accessToken');

      // ЗАГЛУШКА: замените на реальный API вызов
      const response = await fetch('/api/platforms/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          platformId: platform?.id,
          authType,
          credentials: authType === 'username_password'
            ? { username, password }
            : { apiKey },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка авторизации');
      }

      setSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!platform) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Подключить {platform.name}</DialogTitle>
          <DialogDescription>
            Введите учетные данные для авторизации на платформе
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="text-green-600 text-lg font-medium mb-2">✓ Успешно!</div>
            <p className="text-sm text-muted-foreground">
              Учетные данные сохранены и зашифрованы
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auth Type Selection */}
            <div className="space-y-2">
              <Label>Тип авторизации</Label>
              <Select value={authType} onValueChange={(value: any) => setAuthType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username_password">Логин и пароль</SelectItem>
                  <SelectItem value="api_key">API ключ</SelectItem>
                  <SelectItem value="oauth">OAuth (скоро)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Username/Password Form */}
            {authType === 'username_password' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Логин или Email</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Введите логин"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Пароль будет зашифрован и надежно сохранен
                </p>
              </>
            )}

            {/* API Key Form */}
            {authType === 'api_key' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API ключ</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Введите API ключ"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Ключ будет зашифрован и надежно сохранен
                </p>
              </>
            )}

            {/* OAuth Info */}
            {authType === 'oauth' && (
              <div className="p-3 bg-blue-50 rounded text-sm">
                OAuth авторизация будет доступна в ближайшее время
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading || authType === 'oauth'}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить учетные данные'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Отмена
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
