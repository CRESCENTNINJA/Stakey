import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Utility to create an authenticated API instance
const getAuthApi = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: 'http://localhost:5000',
    headers: { 'x-auth-token': token }
  });
};

// We accept a prop `lastUpdate`
// This prop will act as a "trigger" to re-fetch data
export default function TransactionHistory({ lastUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  // This useEffect will run once when the component loads,
  // AND it will re-run *every time* the `lastUpdate` prop changes.
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const api = getAuthApi();
        const res = await api.get('/api/transactions');
        setTransactions(res.data); // Save the list of transactions
      } catch (err) {
        setError('Could not fetch transactions');
      }
    };

    fetchTransactions();
  }, [lastUpdate]); // The dependency array

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (transactions.length === 0) {
    return <p>No transactions yet. Play a game!</p>;
  }

  return (
    <div className="transactions-container">
      <h3>Transaction History</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Source</th>
            <th>Change (Delta)</th>
            <th>Final Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => (
            <tr key={index}>
              {/* Format the timestamp to be more readable */}
              <td>{new Date(tx.timestamp).toLocaleString()}</td>
              <td>{tx.source}</td>
              {/* Add styling based on positive/negative delta */}
              <td className={tx.delta > 0 ? 'win' : 'loss'}>
                {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
              </td>
              <td>{tx.final_updated_value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
