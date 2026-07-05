import { useState, useEffect, useRef } from 'react';
import { apiGet } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { format } from 'date-fns';

export default function MessageList({ roomId }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

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
      className="flex-1 overflow-y-auto px-4 py-2"
    >
      {loadingMore && (
        <div className="text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-1">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {messages.map((msg, idx) => {
            const showDate = shouldShowDateSeparator(msg, idx);
            const isOwn = msg.userId === user.id;
            const isFirstInGroup =
              idx === 0 || messages[idx - 1].userId !== msg.userId;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-gray-800"></div>
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDate(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-gray-800"></div>
                  </div>
                )}

                <div
                  className={`flex gap-3 hover:bg-gray-800/30 px-2 py-0.5 rounded ${
                    isFirstInGroup ? 'mt-3' : ''
                  }`}
                >
                  {/* Avatar or spacer */}
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
                      {msg.content}
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
