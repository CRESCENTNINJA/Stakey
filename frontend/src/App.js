import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import CoinFlipGame from './components/CoinFlipGame';
import TransactionHistory from './components/TransactionHistory'; // 1. Import
import './App.css'; 

function App() {
  const [token, setToken] = useState(null);
  // 2. Add new state. This will just be a timestamp.
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
    setLastUpdate(Date.now()); // Trigger a fetch when we log in
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  // 3. Update this function to change the `lastUpdate` state
  const handleBalanceUpdate = (newBalance) => {
    console.log("Balance updated to:", newBalance);
    // This state change will trigger the useEffect in TransactionHistory
    setLastUpdate(Date.now()); 
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Stake Prototype</h1>
        {token && <button onClick={handleLogout} className="logout-btn">Logout</button>}
      </header>
      <main>
        {!token ? (
          <Auth onLoginSuccess={handleLogin} />
        ) : (
          <div>
            {/* 4. Pass the handler to the game and the state to the history.
            */}
            <CoinFlipGame onBalanceChange={handleBalanceUpdate} />
            <TransactionHistory lastUpdate={lastUpdate} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
