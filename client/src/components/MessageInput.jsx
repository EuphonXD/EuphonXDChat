import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

export default function MessageInput({ roomId, socket }) {
  const [content, setContent] = useState('');
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();

    // Join the Socket.IO room channel when entering a room
    if (socket && roomId) {
      socket.emit('join-room', roomId);
      return () => {
        socket.emit('leave-room', roomId);
      };
    }
  }, [roomId, socket]);

  const handleTyping = () => {
    if (!typing && socket) {
      setTyping(true);
      socket.emit('typing', { roomId, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      if (socket) {
        socket.emit('typing', { roomId, isTyping: false });
      }
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !socket) return;

    socket.emit('send-message', { roomId, content: trimmed });
    setContent('');

    if (typing) {
      clearTimeout(typingTimeoutRef.current);
      setTyping(false);
      socket.emit('typing', { roomId, isTyping: false });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSelectSticker = (url) => {
    if (!socket) return;
    socket.emit('send-message', { roomId, content: `[sticker:${url}]` });
  };

  const handleSelectKaomoji = (k) => {
    setContent((prev) => prev + k);
    inputRef.current?.focus();
  };

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900/50">
      {/* Emoji picker */}
      <div className="relative">
        <EmojiPicker
          isOpen={showEmoji}
          onClose={() => setShowEmoji(false)}
          onSelectSticker={handleSelectSticker}
          onSelectKaomoji={handleSelectKaomoji}
        />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="w-full resize-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-all duration-200"
        >
          <span className="text-xl">😊</span>
        </button>
        <button
          type="submit"
          disabled={!content.trim()}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
  );
}
