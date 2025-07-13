import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = () => {
    if (username.trim()) {
      onLogin(username, roomId);
    }
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl w-full max-w-md">
      <h1 className="text-3xl font-bold text-white mb-6 text-center">Join Chat</h1>
      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full p-3 mb-4 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <input
        type="text"
        placeholder="Enter room ID (optional)"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="w-full p-3 mb-4 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <button
        onClick={handleSubmit}
        className="w-full p-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition"
      >
        Join Room
      </button>
    </div>
  );
}

export default Login;