import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet } from '../utils/api';
import { kaomojiCategories } from '../data/kaomoji';
import CustomEmojiUpload from './CustomEmojiUpload';

const TABS = [
  { key: 'builtin', label: '表情包', icon: '😊' },
  { key: 'custom', label: '自定义', icon: '⭐' },
  { key: 'kaomoji', label: '颜文字', icon: '(^_^)' },
];

export default function EmojiPicker({ isOpen, onClose, onSelectSticker, onSelectKaomoji }) {
  const [activeTab, setActiveTab] = useState('builtin');
  const [packs, setPacks] = useState([]);
  const [activePackId, setActivePackId] = useState(null);
  const [packEmojis, setPackEmojis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [kaomojiSearch, setKaomojiSearch] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    if (isOpen && activeTab === 'builtin') {
      setLoading(true);
      apiGet('/emoji/packs')
        .then((data) => {
          const p = data.packs || [];
          setPacks(p);
          if (p.length > 0) {
            const firstId = activePackId || p[0].id;
            setActivePackId(firstId);
            loadPackEmojis(firstId);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, activeTab]);

  const loadPackEmojis = async (packId) => {
    try {
      const data = await apiGet(`/emoji/packs/${packId}`);
      const cats = data.categories || {};
      const all = [];
      for (const [catName, stickers] of Object.entries(cats)) {
        for (const s of stickers) {
          all.push({ ...s, category: catName });
        }
      }
      setPackEmojis(all);
    } catch {
      setPackEmojis([]);
    }
  };

  const handlePackSwitch = (packId) => {
    setActivePackId(packId);
    loadPackEmojis(packId);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEmojis = packEmojis.filter(
    (e) => !search || e.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredKaomoji = kaomojiCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (k) => !kaomojiSearch || k.toLowerCase().includes(kaomojiSearch.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  // Group emojis by category for display
  const groupedEmojis = {};
  for (const e of filteredEmojis) {
    if (!groupedEmojis[e.category]) groupedEmojis[e.category] = [];
    groupedEmojis[e.category].push(e);
  }

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
      style={{ width: '350px', maxHeight: '400px' }}
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
        {activeTab === 'builtin' && (
          <>
            {/* Pack selector */}
            {packs.length > 1 && (
              <div className="flex gap-1 p-2 border-b border-gray-700 overflow-x-auto">
                {packs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePackSwitch(p.id)}
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                      activePackId === p.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="p-2 border-b border-gray-700">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索表情..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Emoji grid */}
            {loading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : Object.keys(groupedEmojis).length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无表情</div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedEmojis).map(([catName, emojis]) => (
                  <div key={catName} className="mb-3">
                    <div className="text-xs text-gray-500 px-1 mb-1.5 font-medium">{catName}</div>
                    <div className="grid grid-cols-5 gap-1">
                      {emojis.map((emoji, idx) => (
                        <button
                          key={idx}
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
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `<span class="text-xs text-gray-500">${emoji.name.slice(0,4)}</span>`;
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'custom' && (
          <CustomEmojiUpload onClose={onClose} onSelectSticker={onSelectSticker} />
        )}

        {activeTab === 'kaomoji' && (
          <>
            <div className="p-2 border-b border-gray-700">
              <input
                type="text"
                value={kaomojiSearch}
                onChange={(e) => setKaomojiSearch(e.target.value)}
                placeholder="搜索颜文字..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="p-2">
              {filteredKaomoji.map((cat) => (
                <div key={cat.name} className="mb-3">
                  <div className="text-xs text-gray-500 px-1 mb-1.5 font-medium">
                    {cat.emoji} {cat.name}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat.items.map((k, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectKaomoji(k);
                          onClose();
                        }}
                        className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
