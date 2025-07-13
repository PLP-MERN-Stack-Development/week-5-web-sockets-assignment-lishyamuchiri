import React, { useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleLogin = (user, room) => {
    setUsername(user);
    setRoomId(room);
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Chat username={username} roomId={roomId} />
      )}
    </div>
  );
}

export default App;