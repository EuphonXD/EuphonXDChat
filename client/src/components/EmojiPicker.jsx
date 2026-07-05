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
  const [activePack, setActivePack] = useState(null);
  const [search, setSearch] = useState('');
  const [kaomojiSearch, setKaomojiSearch] = useState('');
  const pickerRef = useRef(null);
  const [loadedImages, setLoadedImages] = useState({});

  useEffect(() => {
    if (isOpen) {
      apiGet('/emoji/packs')
        .then((data) => {
          setPacks(data.packs || []);
          if (data.packs?.length > 0) {
            setActivePack(data.packs[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Close on outside click
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

  // Lazy load images
  const handleImageLoad = useCallback((id) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  }, []);

  if (!isOpen) return null;

  const currentPack = packs.find((p) => p.id === activePack) || packs[0];

  const filteredEmojis = currentPack?.emojis?.filter(
    (e) => !search || e.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredKaomoji = kaomojiCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (k) => !kaomojiSearch || k.toLowerCase().includes(kaomojiSearch.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const handleStickerClick = (emoji) => {
    onSelectSticker(emoji.url);
    onClose();
  };

  const handleKaomojiClick = (k) => {
    onSelectKaomoji(k);
  };

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
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-gray-800/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(400px - 44px)' }}>
        {activeTab === 'builtin' && (
          <>
            {/* Pack selector */}
            <div className="flex gap-1 p-2 border-b border-gray-700/50 overflow-x-auto">
              {packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setActivePack(pack.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activePack === pack.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {pack.name}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-3 py-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索表情..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Sticker grid */}
            <div className="grid grid-cols-5 gap-1 p-3">
              {filteredEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  onClick={() => handleStickerClick(emoji)}
                  className="aspect-square rounded-lg bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center p-1 transition-all hover:scale-110 cursor-pointer"
                  title={emoji.name}
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="w-full h-full object-contain rounded"
                    loading="lazy"
                    onLoad={() => handleImageLoad(emoji.id)}
                  />
                </button>
              ))}
              {filteredEmojis.length === 0 && (
                <div className="col-span-5 text-center text-gray-500 py-8 text-sm">
                  没有找到匹配的表情
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'kaomoji' && (
          <>
            {/* Search */}
            <div className="px-3 py-2">
              <input
                type="text"
                value={kaomojiSearch}
                onChange={(e) => setKaomojiSearch(e.target.value)}
                placeholder="搜索颜文字..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Kaomoji by category */}
            <div className="p-3 space-y-3">
              {filteredKaomoji.map((cat) => (
                <div key={cat.name}>
                  <div className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat.items.map((k, i) => (
                      <button
                        key={`${cat.name}-${i}`}
                        onClick={() => handleKaomojiClick(k)}
                        className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-sm text-gray-200 transition-colors cursor-pointer whitespace-nowrap"
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

        {activeTab === 'custom' && (
          <div className="p-3">
            <CustomEmojiUpload />
          </div>
        )}
      </div>
    </div>
  );
}
