import React, { useState } from 'react';
import axios from 'axios';

// Utility to create an authenticated API instance
const getAuthApi = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: 'http://localhost:5000',
    headers: { 'x-auth-token': token } // Send our token with the request
  });
};

export default function CoinFlipGame({ onBalanceChange }) {
  const [bet, setBet] = useState(10);
  const [choice, setChoice] = useState('heads');
  const [result, setResult] = useState(null); // { result, won, newBalance }
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    setResult(null);
    setLoading(true);
    try {
      const api = getAuthApi();
      const res = await api.post('/api/game/coinflip', {
        betAmount: bet,
        choice: choice
      });
      setResult(res.data);
      onBalanceChange(res.data.newBalance); // Tell App.js about the new balance
    } catch (err) {
      setResult({ error: err.response?.data?.msg || 'Game error' });
    }
    setLoading(false);
  };

  return (
    <div className="game-container">
      <h3>Coin Flip</h3>
      <div className="game-controls">
        <label>Bet Amount:</label>
        <input 
          type="number" 
          value={bet}
          min="1"
          onChange={(e) => setBet(e.target.value)}
        />
        <label>Choice:</label>
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="heads">Heads</option>
          <option value="tails">Tails</option>
        </select>
        <button onClick={handlePlay} disabled={loading}>
          {loading ? 'Flipping...' : 'Flip!'}
        </button>
      </div>
      
      {result && (
        <div className="game-result">
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <>
              <p>The coin landed on: <strong>{result.result.toUpperCase()}</strong></p>
              {result.won ? (
                <p className="win">You won {bet * 2}!</p>
              ) : (
                <p className="loss">You lost {bet}.</p>
              )}
              <p>Your new balance: ${result.newBalance}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
