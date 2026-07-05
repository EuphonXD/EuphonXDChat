import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../utils/api';
import { Trash2 } from 'lucide-react';

export default function CustomEmojiUpload() {
  const [customEmojis, setCustomEmojis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCustomEmojis();
  }, []);

  const fetchCustomEmojis = async () => {
    try {
      const data = await apiGet('/emoji/custom');
      setCustomEmojis(data.emojis || []);
    } catch (err) {
      // Silently fail for unauthenticated users
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setName(file.name.replace(/\.[^.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('name', name);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/emoji/custom', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      setCustomEmojis((prev) => [data.emoji, ...prev]);
      setSelectedFile(null);
      setPreview(null);
      setName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert('上传失败: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/emoji/custom/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCustomEmojis((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      // silent
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-3 hover:border-indigo-500/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.gif,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
          className="hidden"
          id="emoji-upload"
        />

        {preview ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src={preview}
                alt="Preview"
                className="w-16 h-16 object-contain rounded bg-gray-700"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="表情名称"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  setName('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !name}
                className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition-colors disabled:opacity-50"
              >
                {uploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="emoji-upload"
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-2xl">📁</span>
            <span className="text-xs text-gray-400">点击上传表情</span>
            <span className="text-[10px] text-gray-500">支持 PNG, GIF, JPG</span>
          </label>
        )}
      </div>

      {/* Custom emoji list */}
      {loading ? (
        <div className="text-center text-gray-500 text-sm py-4">加载中...</div>
      ) : customEmojis.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-4">暂无自定义表情</div>
      ) : (
        <div className="grid grid-cols-5 gap-1">
          {customEmojis.map((emoji) => (
            <div key={emoji.id} className="relative group aspect-square rounded-lg bg-gray-700/50 flex items-center justify-center p-1">
              <img
                src={emoji.url}
                alt={emoji.name}
                className="w-full h-full object-contain rounded"
                title={emoji.name}
              />
              <button
                onClick={() => handleDelete(emoji.id)}
                className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
