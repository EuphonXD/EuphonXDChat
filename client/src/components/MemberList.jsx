import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import { useSocket } from '../contexts/SocketContext';
import { MessageSquare } from 'lucide-react';

export default function MemberList({ roomId, onPrivateChat, currentUserId }) {
  const { onlineUsers } = useSocket();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [roomId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/rooms/${roomId}/members`);
      setMembers(data.members);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const online = members.filter((m) => onlineUsers.includes(m.id));
  const offline = members.filter((m) => !onlineUsers.includes(m.id));

  return (
    <div className="h-full flex flex-col bg-gray-900/50">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Members — {members.length}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {online.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Online — {online.length}
            </div>
            <div className="space-y-0.5">
              {online.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  online
                  isCurrentUser={member.id === currentUserId}
                  onPrivateChat={onPrivateChat}
                />
              ))}
            </div>
          </div>
        )}

        {offline.length > 0 && (
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Offline — {offline.length}
            </div>
            <div className="space-y-0.5">
              {offline.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  online={false}
                  isCurrentUser={member.id === currentUserId}
                  onPrivateChat={onPrivateChat}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberItem({ member, online, isCurrentUser, onPrivateChat }) {
  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          {member.avatar ? (
            <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <span className="text-xs font-medium text-white">
              {(member.nickname || member.username || '?')[0].toUpperCase()}
            </span>
          )}
        </div>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
            online ? 'bg-green-500' : 'bg-gray-600'
          }`}
        />
      </div>
      <span className="flex-1 text-sm text-gray-300 truncate">
        {member.nickname || member.username}
        {isCurrentUser && <span className="text-gray-600 ml-1">(you)</span>}
      </span>
      {!isCurrentUser && (
        <button
          onClick={() => onPrivateChat(member)}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-indigo-400 transition-all"
          title="Send private message"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
