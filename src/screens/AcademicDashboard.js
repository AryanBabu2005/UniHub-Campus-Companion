import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Linking } from 'react-native';
import { Card, Text, Avatar, Chip, Searchbar, IconButton } from 'react-native-paper';
import { db } from '../../firebaseconfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function AcademicDashboard() {
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResources, setFilteredResources] = useState([]);

  useEffect(() => {
    // Real-time listener for new resources
    const q = query(collection(db, "academic_resources"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(data);
      setFilteredResources(data);
    });

    return () => unsubscribe();
  }, []);

  // Search Logic
  const onChangeSearch = query => {
    setSearchQuery(query);
    if (query) {
      const filtered = resources.filter(item => 
        item.subject.toLowerCase().includes(query.toLowerCase()) ||
        item.title.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredResources(filtered);
    } else {
      setFilteredResources(resources);
    }
  };

  // Handle Link Opening
  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const getIcon = (category) => {
    if(category === 'Video') return 'youtube';
    if(category === 'Assignment') return 'pencil-box';
    return 'file-document';
  };

  const getColor = (category) => {
    if(category === 'Video') return '#FF0000'; // YouTube Red
    if(category === 'Assignment') return '#FF9800'; // Orange
    return '#2196F3'; // Blue
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => openLink(item.link)}>
      <Card.Title
        title={item.title}
        subtitle={item.subject}
        left={(props) => <Avatar.Icon {...props} icon={getIcon(item.category)} style={{backgroundColor: getColor(item.category)}} />}
        right={(props) => <IconButton {...props} icon="open-in-new" onPress={() => openLink(item.link)} />}
      />
      <Card.Content>
        <Chip style={styles.chip}>{item.category}</Chip>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold', color:'#6200ee'}}>Academic Hub</Text>
        <Text variant="bodyMedium" style={{color:'gray'}}>Notes, Videos & Assignments</Text>
      </View>

      <Searchbar
        placeholder="Search subject (e.g. CS101)"
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.search}
      />

      <FlatList
        data={filteredResources}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{paddingBottom: 20}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  header: { marginBottom: 15 },
  search: { marginBottom: 15, backgroundColor: 'white' },
  card: { marginBottom: 10, backgroundColor: 'white' },
  chip: { alignSelf: 'flex-start', marginTop: 5 }
});
