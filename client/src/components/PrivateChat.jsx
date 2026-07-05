import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../utils/api';
import { format } from 'date-fns';
import { Send } from 'lucide-react';

export default function PrivateChat({ otherUser, socket }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (!otherUser) return;
    setMessages([]);
    setLoading(true);
    fetchMessages();
  }, [otherUser?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewPrivateMessage = (msg) => {
      if (
        (msg.fromUserId === otherUser?.id && msg.toUserId === user.id) ||
        (msg.fromUserId === user.id && msg.toUserId === otherUser?.id)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('new-private-message', handleNewPrivateMessage);
    return () => socket.off('new-private-message', handleNewPrivateMessage);
  }, [socket, otherUser?.id, user.id]);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  const fetchMessages = async () => {
    try {
      const data = await apiGet(`/messages/private/${otherUser.id}`);
      setMessages(data.messages);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Failed to fetch private messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !socket) return;

    socket.emit('send-private', { toUserId: otherUser.id, content: trimmed });
    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (dateStr) => {
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return '';
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

  if (!otherUser) return null;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-1">开始对话</p>
              <p className="text-sm">给 {otherUser.nickname || otherUser.username}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, idx) => {
              const isOwn = msg.userId === user.id;
              const isFirstInGroup =
                idx === 0 || messages[idx - 1].userId !== msg.userId;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 hover:bg-gray-800/30 px-2 py-0.5 rounded ${
                    isFirstInGroup ? 'mt-3' : ''
                  }`}
                >
                  <div className="w-10 flex-shrink-0">
                    {isFirstInGroup && (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        {msg.avatar ? (
                          <img src={msg.avatar} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium text-white">
                            {(msg.nickname || msg.username || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
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
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`发送消息给 ${otherUser.nickname || otherUser.username}...`}
            rows={1}
            className="flex-1 resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
