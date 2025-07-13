const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data storage
const users = {}; // socket.id -> { username, id, rooms: Set }
const rooms = new Map(); // roomId -> { messages: [], users: Set, unread: Map }
const privateMessages = new Map(); // socket.id -> [{ id, sender, message, timestamp, read, reactions, file }]

// Generate unique room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 10);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  users[socket.id] = { username: null, id: socket.id, rooms: new Set() };

  // Handle user joining
  socket.on('user_join', ({ username, roomId }, callback) => {
    users[socket.id].username = username;
    let targetRoom = roomId || generateRoomId();
    if (!rooms.has(targetRoom)) {
      rooms.set(targetRoom, { messages: [], users: new Set(), unread: new Map() });
    }
    socket.join(targetRoom);
    users[socket.id].rooms.add(targetRoom);
    rooms.get(targetRoom).users.add(socket.id);

    // Initialize unread count
    rooms.get(targetRoom).unread.set(socket.id, 0);

    // Send room messages and user list
    socket.emit('messages', rooms.get(targetRoom).messages);
    io.to(targetRoom).emit('user_list', {
      roomId: targetRoom,
      users: Array.from(rooms.get(targetRoom).users).map(id => users[id].username),
    });
    io.to(targetRoom).emit('user_joined', { username, id: socket.id });
    socket.emit('private_messages', privateMessages.get(socket.id) || []);
    socket.emit('unread_count', { roomId: targetRoom, count: rooms.get(targetRoom).unread.get(socket.id) || 0 });

    callback({ status: 'ok', roomId: targetRoom });
    console.log(`${username} joined room ${targetRoom}`);
  });

  // Handle chat messages
  socket.on('send_message', ({ roomId, message, file }, callback) => {
    if (!rooms.has(roomId)) return;
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      file: file || null,
      timestamp: new Date().toISOString(),
      read: false,
      reactions: {},
    };
    
    rooms.get(roomId).messages.push(messageData);
    if (rooms.get(roomId).messages.length > 100) {
      rooms.get(roomId).messages.shift();
    }

    // Update unread counts
    rooms.get(roomId).users.forEach(userId => {
      if (userId !== socket.id) {
        rooms.get(roomId).unread.set(userId, (rooms.get(roomId).unread.get(userId) || 0) + 1);
        io.to(userId).emit('unread_count', { roomId, count: rooms.get(roomId).unread.get(userId) });
      }
    });

    io.to(roomId).emit('receive_message', messageData);
    callback({ status: 'delivered', messageId: messageData.id });
  });

  // Handle private messages
  socket.on('private_message', ({ to, message, file }, callback) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      file: file || null,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      read: false,
      reactions: {},
    };
    
    const recipientSocketId = Object.keys(users).find(id => users[id].username === to);
    if (recipientSocketId) {
      if (!privateMessages.has(recipientSocketId)) {
        privateMessages.set(recipientSocketId, []);
      }
      privateMessages.get(recipientSocketId).push(messageData);
      socket.to(recipientSocketId).emit('private_message', messageData);
      socket.emit('private_message', messageData);
    }
    callback({ status: 'delivered', messageId: messageData.id });
  });

  // Handle typing indicator
  socket.on('typing', ({ isTyping, roomId, to }) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      if (to) {
        const recipientSocketId = Object.keys(users).find(id => users[id].username === to);
        if (recipientSocketId) {
          socket.to(recipientSocketId).emit('typing_users', isTyping ? [username] : []);
        }
      } else if (roomId && rooms.has(roomId)) {
        socket.to(roomId).emit('typing_users', isTyping ? [username] : []);
      }
    }
  });

  // Handle read receipts
  socket.on('read', ({ messageId, roomId, to }) => {
    if (to) {
      const recipientMessages = privateMessages.get(socket.id) || [];
      const message = recipientMessages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
        const senderSocketId = Object.keys(users).find(id => users[id].username === message.sender);
        if (senderSocketId) {
          socket.to(senderSocketId).emit('read_receipt', { messageId });
        }
      }
    } else if (rooms.has(roomId)) {
      const message = rooms.get(roomId).messages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
        rooms.get(roomId).unread.set(socket.id, 0);
        io.to(roomId).emit('read_receipt', { messageId });
        io.to(socket.id).emit('unread_count', { roomId, count: 0 });
      }
    }
  });

  // Handle message reactions
  socket.on('react', ({ messageId, reaction, roomId, to }) => {
    const username = users[socket.id].username;
    if (to) {
      const recipientMessages = privateMessages.get(socket.id) || [];
      const message = recipientMessages.find(m => m.id === messageId);
      if (message) {
        message.reactions[username] = reaction;
        const recipientSocketId = Object.keys(users).find(id => users[id].username === message.sender);
        if (recipientSocketId) {
          socket.to(recipientSocketId).emit('reaction', { messageId, username, reaction });
        }
        socket.emit('reaction', { messageId, username, reaction });
      }
    } else if (rooms.has(roomId)) {
      const message = rooms.get(roomId).messages.find(m => m.id === messageId);
      if (message) {
        message.reactions[username] = reaction;
        io.to(roomId).emit('reaction', { messageId, username, reaction });
      }
    }
  });

  // Handle message pagination
  socket.on('load_more', ({ roomId, page, limit = 20 }) => {
    if (rooms.has(roomId)) {
      const messages = rooms.get(roomId).messages;
      const start = Math.max(0, messages.length - page * limit);
      const end = messages.length - (page - 1) * limit;
      socket.emit('messages', messages.slice(start, end));
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username, rooms: userRooms } = users[socket.id];
      userRooms.forEach(roomId => {
        if (rooms.has(roomId)) {
          rooms.get(roomId).users.delete(socket.id);
          io.to(roomId).emit('user_list', {
            roomId,
            users: Array.from(rooms.get(roomId).users).map(id => users[id].username),
          });
          io.to(roomId).emit('user_left', { username, id: socket.id });
        }
      });
      console.log(`${username} left the chat`);
      delete users[socket.id];
    }
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json(rooms.get(req.query.roomId)?.messages || []);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };