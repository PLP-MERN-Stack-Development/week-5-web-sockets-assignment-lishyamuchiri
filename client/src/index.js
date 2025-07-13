
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { randomUUID } from 'crypto';
if (!window.crypto) window.crypto = { randomUUID };
import { v4 as uuidv4 } from 'uuid';
if (!window.crypto?.randomUUID) {
  window.crypto = {
    randomUUID: () => uuidv4()
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);