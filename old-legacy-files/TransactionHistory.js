// TransactionHistory.js
// Developer Note: This file displays a user's transaction history.
// Designed for transparency, auditability, and future expansion into export, search, and filter logic.

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Picker } from 'react-native';
import formatCurrency from './formatCurrency'; // Utility for consistent currency formatting

// Sample transaction data (can be replaced with backend API or local storage)
const sampleTransactions = [
  { id: '1', type: 'Send', amount: 25.0, recipient: 'John Doe', date: '2025-09-28' },
  { id: '2', type: 'Receive', amount: 40.0, sender: 'Tasha Green', date: '2025-09-27' },
  { id: '3', type: 'Send', amount: 15.5, recipient: 'Marcus Lee', date: '2025-09-26' },
];

const TransactionHistory = () => {
  const [filterType, setFilterType] = useState('All');

  // Developer Note: Filters transactions by type (Send, Receive, All)
  const filteredTransactions =
    filterType === 'All'
      ? sampleTransactions
      : sampleTransactions.filter((tx) => tx.type === filterType);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.type}>{item.type}</Text>
      <Text style={styles.detail}>
        {item.type === 'Send'
          ? `To: ${item.recipient}`
          : `From: ${item.sender}`}
      </Text>
      <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
      <Text style={styles.date}>{item.date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Transaction History</Text>

      {/* Filter Picker */}
      <Picker
        selectedValue={filterType}
        style={styles.picker}
        onValueChange={(itemValue) => setFilterType(itemValue)}
      >
        <Picker.Item label="All" value="All" />
        <Picker.Item label="Send" value="Send" />
        <Picker.Item label="Receive" value="Receive" />
      </Picker>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

      {/* Developer Note: Future additions could include export to PDF/CSV, search by name/date, or pagination */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
  },
  card: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detail: {
    fontSize: 14,
    marginTop: 4,
  },
  amount: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

export default TransactionHistory;
