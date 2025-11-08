import React, { useState } from 'react';
import axios from 'axios';

// We define our API URL here. 
// This must match the port in your backend's server.js
const API_URL = process.env.REACT_APP_API_URL; 

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const url = isLogin ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;

    try {
      const res = await axios.post(url, { username, password });
      
      if (isLogin) {
        const token = res.data.token;
        localStorage.setItem('token', token); // Save token to browser's storage
        onLoginSuccess(token); // Tell App.js we are logged in
      } else {
        setMessage('Registration successful! Please login.');
        setIsLogin(true); // Switch to login form
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred');
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
      </form>
      <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
      </button>
      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}
    </div>
  );
}
