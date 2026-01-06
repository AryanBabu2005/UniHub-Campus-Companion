import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { auth, db } from '../../firebaseconfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function BroadcastScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  // 1. Get Faculty Details (So we know which Dept to broadcast to)
  useEffect(() => {
    const fetchProfile = async () => {
        const user = auth.currentUser;
        if(user) {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if(docSnap.exists()) {
                setProfile(docSnap.data());
            }
        }
    };
    fetchProfile();
  }, []);

  const handleSend = async () => {
    if (!title || !message) {
        Alert.alert("Error", "Please enter a title and message.");
        return;
    }

    // Check if profile is loaded
    if (!profile) {
        Alert.alert("Error", "Profile data is still loading. Please try again.");
        return;
    }

    // Check if profile has required fields
    if (!profile.college || !profile.department) {
        Alert.alert("Error", "Your profile is missing college or department information.");
        return;
    }

    setLoading(true);
    try {
        // 2. Save to Firestore 'broadcasts' collection
        await addDoc(collection(db, "broadcasts"), {
            title: title,
            message: message,
            createdAt: serverTimestamp(),
            // Critical: Tag the message with College & Dept
            college: profile.college,
            department: profile.department,
            authorName: profile.name || "Faculty",
            authorId: auth.currentUser.uid
        });

        Alert.alert("Sent! 📢", "Your message has been broadcasted to all students in your department.");
        navigation.goBack();

    } catch (error) {
        Alert.alert("Error", error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.header}>New Announcement 📢</Text>
      <Text style={{marginBottom: 20, color:'gray'}}>
        Posting to: {profile?.department || "Loading..."} Department
      </Text>

      <Card style={styles.card}>
        <Card.Content>
            <TextInput 
                label="Title (e.g. Class Cancelled)" 
                value={title} 
                onChangeText={setTitle} 
                mode="outlined"
                style={styles.input}
            />
            
            <TextInput 
                label="Message Details..." 
                value={message} 
                onChangeText={setMessage} 
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
            />

            <Button 
                mode="contained" 
                icon="send" 
                onPress={handleSend} 
                loading={loading}
                disabled={!profile || loading}
                style={{marginTop: 10}}
            >
                Broadcast Now
            </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontWeight:'bold', color: '#6200ee' },
  card: { backgroundColor: 'white' },
  input: { marginBottom: 15, backgroundColor:'white' }
});