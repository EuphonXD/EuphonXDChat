import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import { Hash, Plus, LogOut, User, Compass, MessageCircle, X } from 'lucide-react';
import CreateRoomModal from './CreateRoomModal';

export default function Sidebar({ selectedRoom, onRoomSelect, onProfileClick, onPrivateChat }) {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [exploreRooms, setExploreRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/rooms');
      setRooms(data.rooms.filter((r) => r.isMember));
      setExploreRooms(data.rooms.filter((r) => !r.isMember));
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await apiPost(`/rooms/${roomId}/join`);
      fetchRooms();
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const handleRoomCreated = (room) => {
    fetchRooms();
    onRoomSelect(room);
    setShowCreateModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            WebChat
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-ghost p-2"
            title="创建聊天室"
          >
            <Plus className="w-4 h-4" />
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
              还没有聊天室，创建一个或探索吧！
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
                  <span className="ml-auto text-xs text-gray-600 flex-shrink-0">
                    {room.memberCount}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Explore Rooms */}
          <div className="mt-4">
            <button
              onClick={() => setShowExplore(!showExplore)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span className="text-sm">探索聊天室</span>
              <span className="ml-auto text-xs">{exploreRooms.length}</span>
            </button>

            {showExplore && (
              <div className="mt-1 space-y-0.5 animate-slide-down">
                {exploreRooms.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-gray-600">暂无可探索的聊天室</p>
                ) : (
                  exploreRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Hash className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-400 truncate">{room.name}</div>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-400/10 transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleRoomCreated}
        />
      )}
    </div>
  );
}
