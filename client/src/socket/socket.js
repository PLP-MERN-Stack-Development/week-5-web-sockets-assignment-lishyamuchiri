import { io } from 'socket.io-client'
import { useState, useEffect } from 'react';
console.log('io imported:', io);
console.log('REACT_APP_SOCKET_URL:', process.env.REACT_APP_SOCKET_URL);

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Connect to socket server
  const connect = (username, roomId) => {
    socket.connect();
    if (username) {
      socket.emit('user_join', { username, roomId });
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Send a message
  const sendMessage = (roomId, message, file) => {
    socket.emit('send_message', { roomId, message, file }, ({ status, messageId }) => {
      if (status === 'delivered') {
        console.log('Message delivered:', messageId);
      }
    });
  };

  // Send a private message
  const sendPrivateMessage = (to, message, file) => {
    socket.emit('private_message', { to, message, file }, ({ status, messageId }) => {
      if (status === 'delivered') {
        console.log('Private message delivered:', messageId);
      }
    });
  };

  // Set typing status
  const setTyping = (isTyping, roomId, to) => {
    socket.emit('typing', { isTyping, roomId, to });
  };

  // Load more messages
  const loadMoreMessages = (roomId, page, limit = 20) => {
    socket.emit('load_more', { roomId, page, limit });
  };

  // Send read receipt
  const sendReadReceipt = (messageId, roomId, to) => {
    socket.emit('read', { messageId, roomId, to });
  };

  // Send reaction
  const sendReaction = (messageId, reaction, roomId, to) => {
    socket.emit('react', { messageId, reaction, roomId, to });
  };

  // Socket event listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
      if (message.sender !== socket.id && Notification.permission === 'granted') {
        new Notification(`${message.sender}: ${message.message || 'Sent an image'}`);
      }
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
      if (message.sender !== socket.id && Notification.permission === 'granted') {
        new Notification(`${message.sender}: ${message.message || 'Sent an image'}`);
      }
    };

    const onUserList = ({ roomId, users: userList }) => {
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    const onMessages = (messages) => {
      setMessages((prev) => [...messages, ...prev]);
    };

    const onReadReceipt = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    };

    const onReaction = ({ messageId, username, reaction }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions: { ...msg.reactions, [username]: reaction } }
            : msg
        )
      );
    };

    const onUnreadCount = ({ roomId, count }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          !msg.isPrivate && msg.roomId === roomId ? { ...msg, unreadCount: count } : msg
        )
      );
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    socket.on('messages', onMessages);
    socket.on('read_receipt', onReadReceipt);
    socket.on('reaction', onReaction);
    socket.on('unread_count', onUnreadCount);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('messages', onMessages);
      socket.off('read_receipt', onReadReceipt);
      socket.off('reaction', onReaction);
      socket.off('unread_count', onUnreadCount);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    loadMoreMessages,
    sendReadReceipt,
    sendReaction,
  };
};

export default socket;