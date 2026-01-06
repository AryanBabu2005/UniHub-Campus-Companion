import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, ImageBackground, Alert, TouchableOpacity, Image } from 'react-native';
import { Text, Card, Button, Avatar, Chip, FAB, Portal, Modal, TextInput, RadioButton, IconButton, ActivityIndicator } from 'react-native-paper';
import { db, auth, storage } from '../../firebaseconfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as ImagePicker from 'expo-image-picker';

export default function EntertainmentScreen() {
  // --- STATE MANAGEMENT ---
  const [events, setEvents] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('student');
  const [expandedEventId, setExpandedEventId] = useState(null); // For Read More

  // Modal & Form State
  const [visible, setVisible] = useState(false);
  const [postType, setPostType] = useState('event'); // 'event' or 'spot'
  const [eventType, setEventType] = useState('fun'); // 'fun' or 'academic' (for events)
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState(''); // Date for events, Location/Link for spots
  const [image, setImage] = useState(null); // For poster/spot image
  const [uploading, setUploading] = useState(false);

  // 1. Get Current User Info & Role
  useEffect(() => {
    const fetchUserInfo = async () => {
        const user = auth.currentUser;
        if (user) {
            setCurrentUser(user);
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserRole(docSnap.data().role);
            }
        }
    };
    fetchUserInfo();
  }, []);

  // 2. Fetch Events (Real-time)
  useEffect(() => {
    const q = query(collection(db, "campus_events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 3. Fetch Hangout Spots (Real-time)
  useEffect(() => {
    const q = query(collection(db, "hangout_spots"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  // --- ACTIONS ---

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `posts/${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const storageRef = ref(storage, filename);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        null, 
        (error) => reject(error), 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleAddPost = async () => {
    if (!title || !details) { Alert.alert("Error", "Please fill in all fields."); return; }
    
    setUploading(true);
    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const commonData = {
          title,
          details,
          imageUrl,
          postedBy: currentUser.uid,
          postedByRole: userRole,
          createdAt: serverTimestamp(),
          hypes: 0, // Initialize hypes
      };

      if (postType === 'event') {
        const finalEventType = eventType || (userRole === 'faculty' ? 'academic' : 'fun');
        await addDoc(collection(db, "campus_events"), {
            ...commonData,
            type: finalEventType,
            tag: finalEventType === 'fun' ? '🎉 Fun & Fests' : '🎓 Academic'
        });
      } else {
        await addDoc(collection(db, "hangout_spots"), commonData);
      }

      resetForm();
      Alert.alert("Success", "Post added successfully!");

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (collectionName, docId) => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteDoc(doc(db, collectionName, docId)); } 
          catch (error) { Alert.alert("Error", error.message); }
        }
      }
    ]);
  };

  const handleHype = async (collectionName, docId) => {
    const postRef = doc(db, collectionName, docId);
    await updateDoc(postRef, {
        hypes: increment(1)
    });
  };

  const resetForm = () => {
    setVisible(false); setTitle(''); setDetails(''); setImage(null); setPostType('event');
  };

  const openLink = (url) => { if(url && url.startsWith('http')) Linking.openURL(url); };

  // --- UI HELPERS ---
  const canDelete = (post) => {
      if (!currentUser) return false;
      // Can delete if you posted it OR if you are faculty deleting a student post
      return post.postedBy === currentUser.uid || (userRole === 'faculty' && post.postedByRole === 'student');
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: CHILL ZONE */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>Chill Zone 🎮</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <GameCard title="2048" url="https://play2048.co/" img="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/2048_logo.svg/1200px-2048_logo.svg.png" />
            <GameCard title="Wordle" url="https://www.nytimes.com/games/wordle/index.html" img="https://static01.nyt.com/images/2022/03/02/crosswords/alpha-wordle-icon-new/alpha-wordle-icon-new-square320-v3.png" />
            <GameCard title="Lofi Beats" url="https://www.youtube.com/watch?v=jfKfPfyJRdk" img="https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg" />
        </ScrollView>

        {/* SECTION 2: CAMPUS BUZZ (Events) */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>Campus Buzz 📢</Text>
        {events.map((event) => {
            const isAcademic = event.type === 'academic';
            const isExpanded = expandedEventId === event.id;
            return (
            <Card key={event.id} style={[styles.card, { borderLeftColor: isAcademic ? '#6200ee' : '#FF6B6B' }]}>
                {event.imageUrl && <Card.Cover source={{ uri: event.imageUrl }} style={styles.cardCover} />}
                <Card.Title 
                    title={event.title} 
                    // Removed subtitle={event.details} from here
                    left={(props) => <Avatar.Icon {...props} icon={isAcademic ? "school" : "party-popper"} style={{backgroundColor: isAcademic ? '#E8DEF8' : '#FFD6D6'}} color={isAcademic ? '#6200ee' : '#FF6B6B'} />}
                    right={(props) => canDelete(event) && <IconButton {...props} icon="delete" iconColor="gray" onPress={() => handleDelete("campus_events", event.id)} />}
                />
                <Card.Content>
                    {/* Details with Read More */}
                    <Text numberOfLines={isExpanded ? undefined : 2}>{event.details}</Text>
                    {event.details && event.details.length > 100 && ( // Only show if long enough
                        <TouchableOpacity onPress={() => setExpandedEventId(isExpanded ? null : event.id)}>
                            <Text style={{color: '#6200ee', marginTop: 4, fontWeight: 'bold'}}>
                                {isExpanded ? "Read Less" : "Read More"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.cardFooter}>
                        <Chip icon="tag" style={{backgroundColor: 'transparent'}} textStyle={{fontSize: 12}}>{event.tag}</Chip>
                        <Text variant="labelSmall" style={{color:'gray'}}>
                            by {event.postedByRole === 'faculty' ? 'Faculty' : 'Student'}
                        </Text>
                    </View>
                    {/* Hype Button */}
                    <View style={styles.hypeContainer}>
                        <Button 
                            icon="fire" 
                            mode="text" 
                            textColor="#FF6B6B"
                            onPress={() => handleHype("campus_events", event.id)}
                            contentStyle={{flexDirection: 'row-reverse'}}
                        >
                            Hype {event.hypes > 0 ? `(${event.hypes})` : ''}
                        </Button>
                    </View>
                </Card.Content>
            </Card>
        )})}

        {/* SECTION 3: HANGOUT SPOTS (New) */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>Hangout Spots 📍</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {spots.length === 0 ? <Text style={{marginLeft: 15, color:'gray'}}>No spots shared yet.</Text> : 
            spots.map((spot) => (
                <Card key={spot.id} style={styles.spotCard} onPress={() => openLink(spot.details)}>
                    {spot.imageUrl && <Image source={{uri: spot.imageUrl}} style={styles.spotImage} />}
                    <View style={styles.spotContent}>
                        <Text variant="titleMedium" numberOfLines={1} style={{fontWeight:'bold'}}>{spot.title}</Text>
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop: 5}}>
                             <Text variant="bodySmall" numberOfLines={1} style={{color:'gray', flex: 1, marginRight: 5}}>Tap for Location</Text>
                             {canDelete(spot) && <IconButton icon="delete" size={18} iconColor="gray" style={{margin:0}} onPress={() => handleDelete("hangout_spots", spot.id)} />}
                        </View>
                    </View>
                    {/* Hype Button for Spots too */}
                    <View style={[styles.hypeContainer, {paddingRight: 5, paddingBottom: 5, alignSelf: 'flex-end'}]}>
                        <Button 
                            icon="fire" 
                            mode="text" 
                            textColor="#FF6B6B"
                            labelStyle={{fontSize: 12}}
                            onPress={() => handleHype("hangout_spots", spot.id)}
                            contentStyle={{flexDirection: 'row-reverse', padding: 0, height: 30}}
                        >
                            Hype {spot.hypes > 0 ? `(${spot.hypes})` : ''}
                        </Button>
                    </View>
                </Card>
            ))}
            {spots.length > 0 && <View style={{width: 15}} />}
        </ScrollView>
        
        <View style={{height: 80}} />
      </ScrollView>

      {/* --- FAB --- */}
      <FAB icon="plus" style={styles.fab} label="Share" onPress={() => setVisible(true)} />

      {/* --- MODAL --- */}
      <Portal>
        <Modal visible={visible} onDismiss={resetForm} contentContainerStyle={styles.modal}>
            <Text variant="titleLarge" style={{marginBottom:15, fontWeight:'bold'}}>Share Something!</Text>
            
            <RadioButton.Group onValueChange={setPostType} value={postType}>
                <View style={{flexDirection:'row', marginBottom: 15, justifyContent: 'space-around'}}>
                    <View style={styles.radioOption}><RadioButton value="event" color="#6200ee" /><Text>📢 Event/Buzz</Text></View>
                    <View style={styles.radioOption}><RadioButton value="spot" color="#E91E63" /><Text>📍 Hangout Spot</Text></View>
                </View>
            </RadioButton.Group>

            {postType === 'event' && (
                <View style={{marginBottom: 15}}>
                    <Text variant="bodyMedium" style={{fontWeight:'bold', marginBottom: 5}}>Event Type:</Text>
                    <RadioButton.Group onValueChange={setEventType} value={eventType}>
                        <View style={styles.radioOption}><RadioButton value="fun" color="#FF6B6B" /><Text>🎉 Fun & Fests</Text></View>
                        <View style={styles.radioOption}><RadioButton value="academic" color="#6200ee" /><Text>🎓 Academic</Text></View>
                    </RadioButton.Group>
                </View>
            )}

            <TextInput label={postType === 'event' ? "Event Title" : "Spot Name"} value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />
            <TextInput 
                label={postType === 'event' ? "Date/Details" : "Location Link (Google Maps)"} 
                value={details} 
                onChangeText={setDetails} 
                mode="outlined" 
                style={styles.input} 
                multiline={postType === 'event'} // Multiline for events
                numberOfLines={postType === 'event' ? 4 : 1}
            />
            
            <Button icon="camera" mode="outlined" onPress={pickImage} style={styles.input}>
                {image ? "Change Image" : "Add Poster/Photo"}
            </Button>
            {image && <Image source={{ uri: image }} style={styles.previewImage} />}

            <Button mode="contained" onPress={handleAddPost} loading={uploading} disabled={uploading} style={{marginTop: 10}}>
                {uploading ? "Posting..." : "Post Live"}
            </Button>
        </Modal>
      </Portal>
    </View>
  );
}

// --- SMALL COMPONENTS ---
const GameCard = ({ title, url, img }) => (
    <Card style={styles.gameCard} onPress={() => Linking.openURL(url)}>
        <ImageBackground source={{uri: img}} style={styles.gameBg}>
            <View style={styles.overlay}><Text style={styles.gameText}>{title}</Text></View>
        </ImageBackground>
    </Card>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontWeight: 'bold', color: '#6200ee', margin: 15, marginBottom: 10 },
  horizontalScroll: { paddingLeft: 15, marginBottom: 20 },
  gameCard: { width: 140, height: 140, marginRight: 15, borderRadius: 15, overflow: 'hidden' },
  gameBg: { width: '100%', height: '100%', justifyContent:'flex-end' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 5 },
  gameText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  card: { marginHorizontal: 15, marginBottom: 15, backgroundColor: 'white', borderLeftWidth: 5, overflow: 'hidden' },
  cardCover: { height: 150 },
  cardFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop: 10 },
  spotCard: { width: 180, marginRight: 15, borderRadius: 15, backgroundColor:'white', overflow:'hidden' },
  spotImage: { width: '100%', height: 100 },
  spotContent: { padding: 10 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 15 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  radioOption: { flexDirection: 'row', alignItems: 'center' },
  previewImage: { width: '100%', height: 150, borderRadius: 10, marginBottom: 12 },
  hypeContainer: { alignItems: 'flex-end', marginTop: -10 } // Style for hype button container
});