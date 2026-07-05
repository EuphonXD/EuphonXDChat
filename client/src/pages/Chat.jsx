import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Sidebar from '../components/RoomList';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import MemberList from '../components/MemberList';
import PrivateChat from '../components/PrivateChat';
import UserProfile from '../components/UserProfile';
import { Hash, Users } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [privateChatUser, setPrivateChatUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setPrivateChatUser(null);
  };

  const handlePrivateChat = (member) => {
    setPrivateChatUser(member);
    setSelectedRoom(null);
  };

  return (
    <div className="h-screen flex bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 flex-shrink-0 overflow-hidden`}
      >
        <Sidebar
          selectedRoom={selectedRoom}
          onRoomSelect={handleRoomSelect}
          onProfileClick={() => setShowProfile(true)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-800 flex items-center px-4 flex-shrink-0 bg-gray-900/50 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost mr-2 lg:hidden"
          >
            <Hash className="w-5 h-5" />
          </button>

          {selectedRoom ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Hash className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <h2 className="font-semibold text-white truncate">{selectedRoom.name}</h2>
              {selectedRoom.description && (
                <span className="text-sm text-gray-500 truncate hidden sm:inline">
                  — {selectedRoom.description}
                </span>
              )}
            </div>
          ) : privateChatUser ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                {privateChatUser.avatar ? (
                  <img src={privateChatUser.avatar} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="text-sm font-medium text-white">
                    {(privateChatUser.nickname || privateChatUser.username || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-white truncate">
                {privateChatUser.nickname || privateChatUser.username}
              </h2>
              <span className="text-sm text-gray-500 hidden sm:inline">私信</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Hash className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">选择一个聊天室或开始私聊</span>
            </div>
          )}

          {selectedRoom && (
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`btn-ghost ${showMembers ? 'text-indigo-400' : ''}`}
            >
              <Users className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedRoom ? (
              <>
                <MessageList roomId={selectedRoom.id} />
                <MessageInput roomId={selectedRoom.id} socket={socket} />
              </>
            ) : privateChatUser ? (
              <PrivateChat otherUser={privateChatUser} socket={socket} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Hash className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">选择一个聊天室开始聊天</p>
                </div>
              </div>
            )}
          </div>

          {/* Member Panel */}
          {selectedRoom && showMembers && (
            <div className="w-64 border-l border-gray-800 flex-shrink-0 animate-fade-in">
              <MemberList
                roomId={selectedRoom.id}
                onPrivateChat={handlePrivateChat}
                currentUserId={user.id}
              />
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
