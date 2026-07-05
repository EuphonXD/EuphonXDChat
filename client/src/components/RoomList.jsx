import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { apiGet, apiPost } from '../utils/api';
import { Hash, Plus, LogOut, LogIn, MessageCircle } from 'lucide-react';
import CreateRoomModal from './CreateRoomModal';
import JoinRoomModal from './JoinRoomModal';

export default function Sidebar({ selectedRoom, onRoomSelect, onProfileClick }) {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  // Listen for real-time room updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = ({ roomId, memberCount }) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, memberCount } : r))
      );
    };

    const handleRoomCreated = ({ room }) => {
      // Only add if it's a new room we're not already showing
      setRooms((prev) => {
        if (prev.find((r) => r.id === room.id)) return prev;
        return [room, ...prev];
      });
    };

    socket.on('room-updated', handleRoomUpdated);
    socket.on('room-created', handleRoomCreated);

    return () => {
      socket.off('room-updated', handleRoomUpdated);
      socket.off('room-created', handleRoomCreated);
    };
  }, [socket]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/rooms');
      setRooms(data.rooms);
    } catch (err) {
      console.error('获取聊天室失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomCreated = (room) => {
    fetchRooms();
    onRoomSelect(room);
    setShowCreateModal(false);
  };

  const handleRoomJoined = (room) => {
    fetchRooms();
    onRoomSelect(room);
    setShowJoinModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            EuphonXD Chat
          </h1>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            创建
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            加入
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={onProfileClick}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full" />
            ) : (
              <span className="text-sm font-medium text-white">
                {user.nickname?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-medium text-white truncate">{user.nickname || user.username}</div>
            <div className="text-xs text-gray-500 truncate">@{user.username}</div>
          </div>
          <LogOut className="w-4 h-4 text-gray-500 hover:text-red-400 transition-colors" />
        </button>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              我的聊天室
            </span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">加载中...</div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p className="mb-2">还没有聊天室</p>
              <p className="text-xs text-gray-600">创建一个或通过名称和密码加入</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onRoomSelect(room)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    selectedRoom?.id === room.id
                      ? 'bg-indigo-600/20 text-indigo-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm">{room.name}</span>
                  {room.hasPassword && (
                    <span className="text-xs text-gray-600">🔒</span>
                  )}
                  <span className="ml-auto text-xs text-gray-600 flex-shrink-0">
                    {room.memberCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleRoomCreated}
        />
      )}
      {showJoinModal && (
        <JoinRoomModal
          onClose={() => setShowJoinModal(false)}
          onJoined={handleRoomJoined}
        />
      )}
    </div>
  );
}
