import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../utils/api';

export default function CustomEmojiUpload({ onClose, onSelectSticker }) {
  const [grouped, setGrouped] = useState({});
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState('默认');
  const [newGroupName, setNewGroupName] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  useEffect(() => {
    fetchEmojis();
  }, []);

  const fetchEmojis = async () => {
    try {
      const data = await apiGet('/emoji/custom');
      setGrouped(data.emojis || {});
      setGroups(data.groups || []);
      if (data.groups?.length > 0 && !data.groups.find(g => g.groupName === activeGroup)) {
        setActiveGroup(data.groups[0].groupName);
      }
    } catch (err) {
      console.error('Failed to fetch custom emojis:', err);
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !url.trim()) return;
    try {
      setUploading(true);
      await apiPost('/emoji/custom', { name: name.trim(), url: url.trim(), groupName: activeGroup });
      setName('');
      setUrl('');
      await fetchEmojis();
    } catch (err) {
      console.error('Failed to add emoji:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/emoji/custom/${id}`);
      await fetchEmojis();
    } catch (err) {
      console.error('Failed to delete emoji:', err);
    }
  };

  const handleCreateGroup = () => {
    const g = newGroupName.trim();
    if (g && !groups.find(x => x.groupName === g)) {
      setGroups(prev => [...prev, { groupName: g, count: 0 }]);
      setActiveGroup(g);
      setNewGroupName('');
      setShowNewGroup(false);
    }
  };

  const currentEmojis = grouped[activeGroup] || [];

  return (
    <div className="p-2">
      {/* Group selector */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {groups.map((g) => (
          <button
            key={g.groupName}
            onClick={() => setActiveGroup(g.groupName)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
              activeGroup === g.groupName
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {g.groupName} ({g.count})
          </button>
        ))}
        {showNewGroup ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              placeholder="分组名"
              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
              autoFocus
            />
            <button onClick={handleCreateGroup} className="text-xs text-indigo-400">✓</button>
            <button onClick={() => setShowNewGroup(false)} className="text-xs text-gray-500">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewGroup(true)}
            className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-400 hover:bg-gray-600"
          >
            + 新分组
          </button>
        )}
      </div>

      {/* Add form */}
      <div className="space-y-2 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="表情名称"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="图片URL"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !url.trim() || uploading}
          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-30"
        >
          {uploading ? '添加中...' : '添加到 ' + activeGroup}
        </button>
      </div>

      {/* Emoji grid */}
      {currentEmojis.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-4">该分组暂无表情</div>
      ) : (
        <div className="grid grid-cols-5 gap-1">
          {currentEmojis.map((emoji) => (
            <div key={emoji.id} className="group relative">
              <button
                onClick={() => {
                  onSelectSticker(emoji.url);
                  onClose();
                }}
                className="w-full aspect-square rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center overflow-hidden transition-colors p-1"
                title={emoji.name}
              >
                <img
                  src={emoji.url}
                  alt={emoji.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(emoji.id); }}
                className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
