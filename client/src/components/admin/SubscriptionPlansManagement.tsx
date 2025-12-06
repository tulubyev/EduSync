import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Crown,
  Star,
  Zap,
  Loader2,
  Check,
  X,
  GripVertical,
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxCourses: number | null;
  maxPlatforms: number | null;
  hasAnalytics: boolean;
  hasAdvancedReminders: boolean;
  hasPrioritySupport: boolean;
  features: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
}

interface Props {
  isVisible: boolean;
}

export function SubscriptionPlansManagement({ isVisible }: Props) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    priceMonthly: '0',
    priceYearly: '0',
    maxCourses: '',
    maxPlatforms: '',
    hasAnalytics: false,
    hasAdvancedReminders: false,
    hasPrioritySupport: false,
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    if (isVisible) {
      fetchPlans();
    }
  }, [isVisible]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/subscriptions/admin/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreateMode(true);
    setEditingPlan(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      priceMonthly: '0',
      priceYearly: '0',
      maxCourses: '',
      maxPlatforms: '',
      hasAnalytics: false,
      hasAdvancedReminders: false,
      hasPrioritySupport: false,
      isActive: true,
      sortOrder: plans.length,
    });
    setShowModal(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setIsCreateMode(false);
    setEditingPlan(plan);
    setFormData({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxCourses: plan.maxCourses?.toString() || '',
      maxPlatforms: plan.maxPlatforms?.toString() || '',
      hasAnalytics: plan.hasAnalytics,
      hasAdvancedReminders: plan.hasAdvancedReminders,
      hasPrioritySupport: plan.hasPrioritySupport,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');

      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        priceMonthly: formData.priceMonthly,
        priceYearly: formData.priceYearly,
        maxCourses: formData.maxCourses ? parseInt(formData.maxCourses) : null,
        maxPlatforms: formData.maxPlatforms ? parseInt(formData.maxPlatforms) : null,
        hasAnalytics: formData.hasAnalytics,
        hasAdvancedReminders: formData.hasAdvancedReminders,
        hasPrioritySupport: formData.hasPrioritySupport,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        features: {},
      };

      const url = isCreateMode 
        ? '/api/subscriptions/admin/plans'
        : `/api/subscriptions/admin/plans/${editingPlan?.id}`;

      const response = await fetch(url, {
        method: isCreateMode ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowModal(false);
        fetchPlans();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (plan.code === 'free') {
      alert('Нельзя удалить бесплатный план');
      return;
    }

    if (!confirm(`Удалить план "${plan.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/subscriptions/admin/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchPlans();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Ошибка удаления');
    }
  };

  const getPlanIcon = (code: string) => {
    switch (code) {
      case 'premium':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'standard':
        return <Zap className="w-5 h-5 text-blue-500" />;
      default:
        return <Star className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Бесплатно' : `${num.toLocaleString('ru-RU')} ₽`;
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Управление планами подписки</h2>
        </div>
        <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Добавить план
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={`${!plan.isActive ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-400 cursor-move">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    {getPlanIcon(plan.code)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {plan.code}
                        </Badge>
                        {!plan.isActive && (
                          <Badge variant="outline" className="text-xs text-red-600">
                            Неактивен
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{plan.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        {formatPrice(plan.priceMonthly)}/мес
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPrice(plan.priceYearly)}/год
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {plan.hasAnalytics && (
                        <Badge variant="outline" className="text-xs">Аналитика</Badge>
                      )}
                      {plan.hasAdvancedReminders && (
                        <Badge variant="outline" className="text-xs">Напоминания</Badge>
                      )}
                      {plan.hasPrioritySupport && (
                        <Badge variant="outline" className="text-xs">VIP</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(plan)}
                        disabled={plan.code === 'free'}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {plans.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Нет планов подписки. Нажмите "Добавить план" чтобы создать первый.
            </div>
          )}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreateMode ? 'Создать план подписки' : 'Редактировать план'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Код (уникальный)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="standard"
                  disabled={!isCreateMode && formData.code === 'free'}
                />
              </div>
              <div>
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Стандарт"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание плана"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceMonthly">Цена/месяц (₽)</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                  placeholder="299"
                />
              </div>
              <div>
                <Label htmlFor="priceYearly">Цена/год (₽)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  value={formData.priceYearly}
                  onChange={(e) => setFormData({ ...formData, priceYearly: e.target.value })}
                  placeholder="2990"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxCourses">Макс. курсов (пусто = безлимит)</Label>
                <Input
                  id="maxCourses"
                  type="number"
                  value={formData.maxCourses}
                  onChange={(e) => setFormData({ ...formData, maxCourses: e.target.value })}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="maxPlatforms">Макс. платформ (пусто = безлимит)</Label>
                <Input
                  id="maxPlatforms"
                  type="number"
                  value={formData.maxPlatforms}
                  onChange={(e) => setFormData({ ...formData, maxPlatforms: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sortOrder">Порядок сортировки</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasAnalytics">Расширенная аналитика</Label>
                <Switch
                  id="hasAnalytics"
                  checked={formData.hasAnalytics}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasAnalytics: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="hasAdvancedReminders">Умные напоминания</Label>
                <Switch
                  id="hasAdvancedReminders"
                  checked={formData.hasAdvancedReminders}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasAdvancedReminders: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="hasPrioritySupport">Приоритетная поддержка</Label>
                <Switch
                  id="hasPrioritySupport"
                  checked={formData.hasPrioritySupport}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasPrioritySupport: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Активен</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving || !formData.code || !formData.name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
