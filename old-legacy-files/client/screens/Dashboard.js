// client/screens/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';
import TransactionCard from '../components/TransactionCard';

const mockTransactions = [
  { id: 1, type: 'Sent', to: 'John Doe', amount: 50, date: '2025-09-27' },
  { id: 2, type: 'Received', from: 'Community Fund', amount: 100, date: '2025-09-26' },
];

export default function Dashboard() {
  const balance = 250; // Later: fetch from backend or context

  return (
    <div style={styles.container}>
      <h2>Dashboard</h2>
      <p style={styles.balance}>Balance: ${balance.toFixed(2)}</p>

      <div style={styles.actions}>
        <Link to="/send"><button style={styles.button}>Send</button></Link>
        <Link to="/receive"><button style={styles.button}>Receive</button></Link>
      </div>

      <h3>Recent Transactions</h3>
      {mockTransactions.map(tx => (
        <TransactionCard key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '600px',
    margin: '0 auto',
  },
  balance: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#34495e',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
};
