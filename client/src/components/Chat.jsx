import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../socket/socket';
import UserList from './UserList';

function Chat({ username, roomId }) {
  const {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    connect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    loadMoreMessages,
    sendReadReceipt,
    sendReaction,
  } = useSocket();
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    connect(username, roomId);
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [username, roomId, connect]);

  useEffect(() => {
    socket.on('messages', (newMessages) => {
      setHasMore(newMessages.length === 20); // Assume 20 is the limit; update if fewer messages are returned
    });
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    return () => {
      socket.off('messages');
    };
  }, [messages, socket]);

  const handleSendMessage = () => {
    if (message.trim()) {
      if (selectedUser) {
        sendPrivateMessage(selectedUser, message, null);
      } else {
        sendMessage(roomId, message, null);
      }
      setMessage('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (selectedUser) {
          sendPrivateMessage(selectedUser, '', reader.result);
        } else {
          sendMessage(roomId, '', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    setTyping(e.target.value.length > 0, roomId, selectedUser);
  };

  const handleLoadMore = () => {
    if (hasMore && !selectedUser) {
      loadMoreMessages(roomId, page + 1);
      setPage((prev) => prev + 1);
    }
  };

  const filteredMessages = messages.filter(
    (msg) =>
      (!selectedUser || (msg.isPrivate && (msg.sender === selectedUser || msg.sender === username))) &&
      (msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
       msg.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl w-full max-w-4xl flex flex-col h-[80vh] md:flex-row chat-container">
      <UserList users={users.filter(u => u !== username)} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4 p-4">
          <h1 className="text-2xl font-bold text-white">
            {selectedUser ? `Chat with ${selectedUser}` : `Room: ${roomId}`}
            <span className="ml-2 text-sm">{isConnected ? '(Online)' : '(Offline)'}</span>
          </h1>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="p-2 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-white bg-opacity-5 rounded-lg">
          {!selectedUser && page > 1 && (
            <button
              onClick={handleLoadMore}
              disabled={!hasMore}
              className="w-full p-2 mb-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-500"
            >
              Load More
            </button>
          )}
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`my-2 p-3 rounded-lg max-w-[70%] message ${
                msg.sender === username
                  ? 'ml-auto bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                  : 'mr-auto bg-white bg-opacity-20 text-white'
              }`}
              onClick={() => !msg.read && sendReadReceipt(msg.id, roomId, msg.isPrivate ? msg.sender : null)}
            >
              <div className="font-bold">{msg.sender}</div>
              {msg.message && <div>{msg.message}</div>}
              {msg.file && <img src={msg.file} alt="Shared" className="max-w-full h-auto rounded-lg mt-2" />}
              <div className="text-xs text-gray-300">
                {new Date(msg.timestamp).toLocaleTimeString()}
                {msg.read && msg.sender !== username && <span className="ml-2">✓✓</span>}
                {msg.unreadCount > 0 && !msg.isPrivate && <span className="ml-2">({msg.unreadCount} unread)</span>}
                {msg.system && <span className="ml-2 italic">{msg.message}</span>}
              </div>
              <div className="flex mt-2">
                {['👍', '❤️', '😂'].map((reaction) => (
                  <button
                    key={reaction}
                    onClick={() => sendReaction(msg.id, reaction, roomId, msg.isPrivate ? msg.sender : null)}
                    className={`mr-2 text-sm reaction ${msg.reactions[username] === reaction ? 'opacity-100' : 'opacity-50'}`}
                  >
                    {reaction}
                  </button>
                ))}
              </div>
              {Object.entries(msg.reactions).map(([user, reaction]) => (
                <div key={user} className="text-xs text-gray-300">
                  {user}: {reaction}
                </div>
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
          {typingUsers.length > 0 && (
            <div className="text-gray-300 text-sm italic">
              {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
            </div>
          )}
        </div>
        <div className="mt-4 flex">
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 p-3 rounded-l-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="p-3 bg-gray-500 text-white hover:bg-gray-600"
          >
            📎
          </button>
          <button
            onClick={handleSendMessage}
            className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-r-lg hover:from-purple-600 hover:to-indigo-600 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;