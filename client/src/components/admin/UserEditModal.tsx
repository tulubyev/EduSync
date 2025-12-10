import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  planType: string;
  createdAt: string;
  profileImageUrl?: string;
}

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, data: any) => Promise<void>;
  onDelete?: (userId: string) => Promise<void>;
}

export function UserEditModal({ user, isOpen, onClose, onSave, onDelete }: UserEditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      });
      setError('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(user.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Вы уверены? Это действие необратимо.')) return;

    try {
      setDeleting(true);
      await onDelete(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = !user.isEmailVerified && !user.isPhoneVerified;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Редактирование пользователя
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors min-h-11 min-w-11 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {error && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              ❌ {error}
            </div>
          )}

          {/* Profile Photo */}
          {user.profileImageUrl && (
            <div className="mb-6 text-center">
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-24 h-24 rounded-lg object-cover mx-auto"
              />
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фамилия
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-10"
              />
            </div>

            {/* Verification Checkboxes */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <label className="flex items-center gap-2 cursor-pointer min-h-11">
                <input
                  type="checkbox"
                  checked={formData.isEmailVerified}
                  onChange={(e) => setFormData({ ...formData, isEmailVerified: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Email ✓</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer min-h-11">
                <input
                  type="checkbox"
                  checked={formData.isPhoneVerified}
                  onChange={(e) => setFormData({ ...formData, isPhoneVerified: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Телефон ✓</span>
              </label>
            </div>

            {/* Info */}
            <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1 border border-gray-200">
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Присоединился:</strong> {new Date(user.createdAt).toLocaleDateString('ru-RU')}</div>
              <div><strong>План:</strong> {user.planType}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 justify-end">
          {onDelete && canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 cursor-pointer min-h-11 transition-colors"
            >
              {deleting ? 'Удаление...' : '🗑️ Удалить'}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 min-h-11 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 cursor-pointer min-h-11 transition-colors"
          >
            {saving ? 'Сохранение...' : '✓ Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
