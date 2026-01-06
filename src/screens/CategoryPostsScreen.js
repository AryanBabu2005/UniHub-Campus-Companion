import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Avatar, FAB, Portal, Modal, TextInput, Button, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { db, auth } from '../../firebaseconfig';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export default function CategoryPostsScreen({ route, navigation }) {
  const { categoryId, categoryTitle } = route.params;
  const theme = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: categoryTitle });
    const user = auth.currentUser;
    if (user) {
        setCurrentUser(user);
    }
  }, []);

  // Fetch Posts
  useEffect(() => {
    const q = query(
      collection(db, "discussion_posts"),
      where("category", "==", categoryId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = Promise.all(snapshot.docs.map(async (postDoc) => {
        const data = postDoc.data();
        let authorName = "Anonymous";
        // Fetch author's name
        if (data.authorId) {
            try {
                const userSnap = await getDoc(doc(db, "users", data.authorId));
                if (userSnap.exists()) {
                    authorName = userSnap.data().name;
                }
            } catch (e) { console.error("Error fetching author:", e); }
        }
        return { id: postDoc.id, ...data, authorName };
      }));
      postsData.then(p => {
          setPosts(p);
          setLoading(false);
      });
    });
    return () => unsubscribe();
  }, [categoryId]);

  const handleAddPost = async () => {
    if (!newPostContent.trim()) {
        Alert.alert("Error", "Post content cannot be empty.");
        return;
    }
    setPosting(true);
    try {
      await addDoc(collection(db, "discussion_posts"), {
        content: newPostContent,
        category: categoryId,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setVisible(false);
      setNewPostContent('');
      Alert.alert("Success", "Post submitted!");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
                await deleteDoc(doc(db, "discussion_posts", postId));
            } catch (error) {
                Alert.alert("Error", error.message);
            }
        }}
    ]);
  };

  const renderPost = ({ item }) => (
    <Card style={styles.postCard}>
      {/* --- FIX: Changed Card.Header to Card.Title --- */}
      <Card.Title
        title={item.authorName}
        subtitle={item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
        left={(props) => <Avatar.Icon {...props} icon="account" style={{backgroundColor: theme.colors.secondaryContainer}} color={theme.colors.onSecondaryContainer} />}
        right={(props) => (currentUser && item.authorId === currentUser.uid) ? <IconButton {...props} icon="delete-outline" onPress={() => handleDeletePost(item.id)} /> : null}
      />
      <Card.Content>
        <Text variant="bodyMedium" style={styles.postContent}>{item.content}</Text>
      </Card.Content>
    </Card>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No posts yet in this category. Be the first!</Text>}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => setVisible(true)}
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Text variant="titleLarge" style={{ marginBottom: 15, fontWeight: 'bold' }}>New Post in {categoryTitle}</Text>
            <TextInput
              label="What's on your mind?"
              value={newPostContent}
              onChangeText={setNewPostContent}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
                <Button mode="text" onPress={() => setVisible(false)} style={{marginRight: 10}}>Cancel</Button>
                <Button mode="contained" onPress={handleAddPost} loading={posting} disabled={posting}>
                {posting ? "Posting..." : "Post"}
                </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, paddingBottom: 80 },
  postCard: { marginBottom: 15, borderRadius: 12, backgroundColor: 'white' },
  postContent: { marginTop: 10, fontSize: 15, lineHeight: 22 },
  emptyText: { textAlign: 'center', marginTop: 50, color: 'gray', fontSize: 16 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 15 },
  input: { marginBottom: 20, backgroundColor: 'white' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' }
});