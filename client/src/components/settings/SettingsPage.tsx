import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Upload, Mail, Phone, BookOpen, Shield } from 'lucide-react';
import { StepikConnectionPage } from './StepikConnectionPage';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profileImageUrl?: string;
  profileImage?: string;
  planType: string;
  role: string;
  adminRole?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedProfile = {
          ...data,
          profileImageUrl: data.profileImage || data.profileImageUrl || null,
        };
        setProfile(normalizedProfile);
        setFormData({
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
        });
        setNewPhotoPreview(null);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email обязателен';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }

    if (!formData.firstName) newErrors.firstName = 'Имя обязательно';
    if (!formData.lastName) newErrors.lastName = 'Фамилия обязательна';

    if (!formData.phone) newErrors.phone = 'Телефон обязателен';
    else if (!/^[\d\s\-\+\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Некорректный формат телефона';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'Размер фото не должен превышать 5MB' }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photo: 'Пожалуйста, выберите изображение' }));
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, photo: '' }));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = { target: { files: [file] } } as any;
      handlePhotoUpload(event);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      
      let uploadedImageUrl: string | null = null;

      if (selectedFile) {
        const photoFormData = new FormData();
        photoFormData.append('photo', selectedFile);

        const photoRes = await fetch('/api/users/profile/photo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: photoFormData,
        });

        if (photoRes.ok) {
          const photoData = await photoRes.json();
          uploadedImageUrl = photoData.profileImage || null;
        } else {
          const err = await photoRes.json().catch(() => ({}));
          setErrors(prev => ({ ...prev, photo: err.message || 'Ошибка загрузки фото' }));
        }
      }

      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors(prev => ({
          ...prev,
          submit: error.message || 'Ошибка при сохранении профиля',
        }));
        return;
      }

      const updatedProfileData = await response.json();
      
      setSuccessMessage('✓ Профиль успешно обновлен');
      const fullProfileData = {
        ...updatedProfileData,
        profileImageUrl: uploadedImageUrl || profile?.profileImageUrl || null,
      };
      setProfile(fullProfileData);
      
      // Dispatch custom event to notify App component about user update (including new avatar)
      window.dispatchEvent(new CustomEvent('userUpdated', { 
        detail: fullProfileData
      }));
      
      // Re-fetch profile to ensure we have the latest data from database
      setTimeout(() => {
        fetchProfile();
        setSuccessMessage('');
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при сохранении профиля';
      console.error('❌ Save profile error:', errorMessage);
      setErrors(prev => ({
        ...prev,
        submit: errorMessage,
      }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'bg-amber-100 text-amber-800';
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: 'Бесплатный план',
      premium: 'Premium план',
      pro: 'Pro план',
      family: 'Семейный план',
      business: 'Бизнес план',
    };
    return labels[plan] || plan;
  };

  const getAdminRoleLabel = (adminRole?: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Супер Администратор',
      analytics_admin: 'Аналитик',
      devops_admin: 'DevOps Администратор',
      finance_admin: 'Финансовый Администратор',
      api_admin: 'API Администратор',
      security_admin: 'Администратор Безопасности',
    };
    return adminRole ? labels[adminRole] || adminRole : null;
  };

  const getAdminRoleBadgeColor = (adminRole?: string) => {
    switch (adminRole) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'analytics_admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'devops_admin': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'finance_admin': return 'bg-green-100 text-green-800 border-green-200';
      case 'api_admin': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'security_admin': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">⚙️ Настройки</h1>
        <p className="text-muted-foreground">Управление вашим профилем и учетной записью</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Платформы
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              ✓ {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ✕ {errors.submit}
            </div>
          )}

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Профиль пользователя
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Upload */}
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {newPhotoPreview || profile?.profileImageUrl ? (
                      <img
                        src={newPhotoPreview || profile?.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Перетащите фото или нажмите</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  {errors.photo && <p className="text-red-600 text-sm mt-2">{errors.photo}</p>}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* First Name */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Имя</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Фамилия</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4" />
                    Телефон
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </CardContent>
          </Card>

          {/* Role Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Роль в системе
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Тип учётной записи</p>
                  <p className="text-base font-semibold">
                    {profile?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </p>
                </div>
                <Badge className={profile?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                  {profile?.role === 'admin' ? 'ADMIN' : 'USER'}
                </Badge>
              </div>
              {profile?.adminRole && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Административная роль</p>
                    <p className="text-base font-semibold">{getAdminRoleLabel(profile.adminRole)}</p>
                  </div>
                  <Badge className={getAdminRoleBadgeColor(profile.adminRole)}>
                    {profile.adminRole.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle>Статус подписки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Текущий план</p>
                  <p className="text-lg font-semibold">{profile && getPlanLabel(profile.planType)}</p>
                </div>
                <Badge className={getPlanBadgeColor(profile?.planType || 'free')}>
                  {profile?.planType.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Информация об учетной записи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">ID пользователя:</span>
                <span className="font-mono text-sm">{profile?.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Создана:</span>
                <span>{profile && new Date(profile.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Статус:</span>
                <span className="text-green-600 font-medium">✓ Активна</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <StepikConnectionPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
