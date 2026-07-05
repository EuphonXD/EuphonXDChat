import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiPut } from '../utils/api';
import { X, Camera, Check, User } from 'lucide-react';

export default function UserProfile({ onClose }) {
  const { user, updateUser, logout } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('头像大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const data = await apiPut('/auth/profile', {
        nickname: nickname.trim() || user.username,
        avatar: avatar || null,
      });
      updateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md mx-4 p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">个人设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">点击更换头像</p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="input-dark opacity-60 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              显示名称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input-dark"
              placeholder="输入显示名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              邮箱
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input-dark opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                已保存！
              </>
            ) : (
              '保存修改'
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors text-sm font-medium"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
