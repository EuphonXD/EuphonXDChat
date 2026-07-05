import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { format } from 'date-fns';
import { Image, X } from 'lucide-react';

export default function MessageList({ roomId, onBackgroundChange }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [bgUrl, setBgUrl] = useState(null);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const bgInputRef = useRef(null);

  // Load room background
  useEffect(() => {
    if (!roomId) return;
    apiGet(`/emoji/background/${roomId}`)
      .then((data) => {
        setBgUrl(data.background?.imageUrl || null);
        if (onBackgroundChange) onBackgroundChange(data.background?.imageUrl || null);
      })
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    setLoading(true);
    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('new-message', handleNewMessage);
    return () => socket.off('new-message', handleNewMessage);
  }, [socket, roomId]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  const fetchMessages = async (before) => {
    try {
      if (before) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({ limit: '50' });
      if (before) params.append('before', before);

      const data = await apiGet(`/messages/room/${roomId}?${params}`);
      const newMessages = data.messages;

      if (before) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
        setTimeout(scrollToBottom, 50);
      }

      setHasMore(newMessages.length === 50);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);

    if (scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
      fetchMessages(messages[0].createdAt);
    }
  };

  const groupMessages = (msgs) => {
    const groups = [];
    let currentGroup = null;

    for (const msg of msgs) {
      const isConsecutive =
        currentGroup &&
        currentGroup.userId === msg.userId &&
        new Date(msg.createdAt) - new Date(currentGroup.messages[currentGroup.messages.length - 1].createdAt) < 60000;

      if (isConsecutive) {
        currentGroup.messages.push(msg);
      } else {
        currentGroup = { userId: msg.userId, messages: [msg] };
        groups.push(currentGroup);
      }
    }

    return groups;
  };

  const formatTime = (dateStr) => {
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  const shouldShowDateSeparator = (msg, index) => {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].createdAt);
    const curr = new Date(msg.createdAt);
    return prev.toDateString() !== curr.toDateString();
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/emoji/background/${roomId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.background) {
        setBgUrl(data.background.imageUrl);
        if (onBackgroundChange) onBackgroundChange(data.background.imageUrl);
      }
    } catch (err) {
      console.error('Failed to upload background:', err);
    }
    setShowBgMenu(false);
  };

  const handleBgDelete = async () => {
    try {
      await apiDelete(`/emoji/background/${roomId}`);
      setBgUrl(null);
      if (onBackgroundChange) onBackgroundChange(null);
    } catch (err) {
      console.error('Failed to delete background:', err);
    }
    setShowBgMenu(false);
  };

  const groups = groupMessages(messages);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 relative"
      style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}}
    >
      {/* Background overlay */}
      {bgUrl && <div className="fixed inset-0 bg-black/40 pointer-events-none z-0" />}

      {/* Background settings button */}
      <div className="fixed bottom-20 right-4 z-30">
        <div className="relative">
          <button
            onClick={() => setShowBgMenu(!showBgMenu)}
            className="w-9 h-9 rounded-full bg-gray-800/80 hover:bg-gray-700/80 flex items-center justify-center transition-colors border border-gray-700"
            title="设置聊天背景"
          >
            <Image className="w-4 h-4 text-gray-400" />
          </button>
          {showBgMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-3 min-w-[180px]">
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-gray-700 transition-colors"
              >
                📷 上传背景图
              </button>
              {bgUrl && (
                <button
                  onClick={handleBgDelete}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  🗑️ 移除背景
                </button>
              )}
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
            </div>
          )}
        </div>
      </div>
      {loadingMore && (
        <div className="text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-1">暂无消息</p>
            <p className="text-sm">开始对话吧！</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1 relative z-10">
          {messages.map((msg, idx) => {
            const showDate = shouldShowDateSeparator(msg, idx);
            const isOwn = msg.userId === user.id;
            const isFirstInGroup =
              idx === 0 || messages[idx - 1].userId !== msg.userId;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 sm:gap-4 my-3 sm:my-4">
                    <div className="flex-1 h-px bg-gray-800"></div>
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDate(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-gray-800"></div>
                  </div>
                )}

                <div
                  className={`flex gap-2 sm:gap-3 hover:bg-gray-800/30 px-1 sm:px-2 py-0.5 rounded ${
                    isFirstInGroup ? 'mt-2 sm:mt-3' : ''
                  }`}
                >
                  {/* Avatar or spacer */}
                  <div className="w-8 sm:w-10 flex-shrink-0">
                    {isFirstInGroup && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        {msg.avatar ? (
                          <img
                            src={msg.avatar}
                            alt=""
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-medium text-white">
                            {(msg.nickname || msg.username || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isFirstInGroup && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-medium text-white text-sm">
                          {msg.nickname || msg.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">
                      {msg.content.startsWith('[sticker:') && msg.content.endsWith(']') ? (
                        <img
                          src={msg.content.slice(9, -1)}
                          alt="sticker"
                          className="max-w-[200px] max-h-[200px] object-contain inline-block"
                          loading="lazy"
                        />
                      ) : (
                        msg.content
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
