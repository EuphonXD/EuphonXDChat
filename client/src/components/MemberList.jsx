import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { UserPlus, Search, X } from 'lucide-react';

export default function MemberList({ roomId, onPrivateChat, currentUserId }) {
  const { socket } = useSocket();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    const handleJoin = () => fetchMembers();
    const handleLeave = () => fetchMembers();
    socket.on('user-joined', handleJoin);
    socket.on('user-left', handleLeave);
    return () => {
      socket.off('user-joined', handleJoin);
      socket.off('user-left', handleLeave);
    };
  }, [socket, roomId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/rooms/${roomId}/members`);
      setMembers(data.members);
    } catch (err) {
      console.error('获取成员失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const data = await apiGet(`/rooms/search/users?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(data.users.filter(u => !members.find(m => m.id === u.id)));
    } catch (err) {
      console.error('搜索用户失败:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId) => {
    try {
      await apiPost(`/rooms/${roomId}/invite`, { userId });
      fetchMembers();
      setSearchQuery('');
      setSearchResults([]);
      setShowInvite(false);
    } catch (err) {
      console.error('邀请失败:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          成员 — {members.length}
        </h3>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="text-gray-500 hover:text-indigo-400 transition-colors"
          title="邀请成员"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {showInvite && (
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="搜索用户名或昵称..."
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <span className="text-xs text-white">{(u.nickname || u.username)[0].toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-300 flex-1 truncate">{u.nickname || u.username}</span>
                  <button
                    onClick={() => handleInvite(u.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-indigo-400/10"
                  >
                    邀请
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && !searching && (
            <p className="text-xs text-gray-600 mt-2 text-center">未找到用户</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">加载中...</div>
        ) : (
          <div className="p-2 space-y-0.5">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <span className="text-xs font-medium text-white">
                      {(member.nickname || member.username)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {member.nickname || member.username}
                    {member.id === currentUserId && (
                      <span className="text-xs text-gray-500 ml-1">（我）</span>
                    )}
                  </div>
                </div>
                {member.id !== currentUserId && (
                  <button
                    onClick={() => onPrivateChat(member)}
                    className="text-xs text-gray-500 hover:text-indigo-400 px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
                    title="发送私信"
                  >
                    私信
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
