// Favorites.js
// Developer Note: This file manages user-selected favorite contacts.
// Designed for fast access, personalization, and future expansion into smart suggestions or contact syncing.

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

// Sample contact data (can be replaced with backend or local storage)
const initialFavorites = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Tasha Green' },
  { id: '3', name: 'Marcus Lee' },
];

const Favorites = ({ onSelect }) => {
  const [favorites, setFavorites] = useState(initialFavorites);

  const handleSelect = (contact) => {
    onSelect(contact);
    // Developer Note: This triggers a send/receive flow with pre-filled contact info
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
      <Text style={styles.name}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Favorite Contacts</Text>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
      {/* Developer Note: Future additions could include search, edit/remove, or sync with phone contacts */}
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
  card: {
    padding: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
  },
});

export default Favorites;
