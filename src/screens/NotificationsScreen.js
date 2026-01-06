import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Chip } from 'react-native-paper';
import { auth, db } from '../../firebaseconfig';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
        const user = auth.currentUser;
        if(!user) return;

        // 1. Get Student Profile to know their Dept
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if(!userSnap.exists()) return;
        const userData = userSnap.data();

        // 2. Query Broadcasts matching their College & Dept
        const q = query(
            collection(db, "broadcasts"),
            where("college", "==", userData.college),
            where("department", "==", userData.department),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
        setNotifications(list);

    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotifications} />}
      >
        {notifications.length === 0 && !loading && (
            <Text style={{textAlign:'center', marginTop: 50, color:'gray'}}>No new announcements.</Text>
        )}

        {notifications.map((note) => (
            <Card key={note.id} style={styles.card}>
                <Card.Title 
                    title={note.title} 
                    subtitle={`By: ${note.authorName}`}
                    left={props => <Avatar.Icon {...props} icon="bullhorn" style={{backgroundColor:'#FF9800'}} />}
                />
                <Card.Content>
                    <Text variant="bodyMedium">{note.message}</Text>
                    <Text style={styles.date}>
                        {note.createdAt ? new Date(note.createdAt.seconds * 1000).toDateString() : 'Just now'}
                    </Text>
                </Card.Content>
            </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  card: { marginBottom: 15, backgroundColor: 'white' },
  date: { marginTop: 10, fontSize: 12, color: 'gray', textAlign: 'right' }
});