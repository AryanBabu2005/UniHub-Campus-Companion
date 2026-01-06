import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Text, Card, Avatar, ActivityIndicator, useTheme, SegmentedButtons, Chip, IconButton, Portal, Modal, Button, Divider, TextInput as PaperInput, Searchbar } from 'react-native-paper';
import { db } from '../../firebaseconfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- MASTER SUBJECT LIST ---
const MASTER_SUBJECT_LIST = [
    'CS101 - Intro to Programming',
    'CS102 - Data Structures',
    'CS201 - Algorithms',
    'CS301 - Database Systems',
    'MATH101 - Calculus I',
    'MATH201 - Linear Algebra',
    'PHY101 - Mechanics',
    'ENG101 - Comm Skills',
    'CHEM101 - Basic Chemistry',
    'AI401 - Artificial Intelligence',
    'ML402 - Machine Learning',
    // Add more subjects as needed...
];


export default function AdminPanelScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [viewMode, setViewMode] = useState('faculty'); // 'student' or 'faculty'

  // --- MAIN LIST FILTERING STATE (NEW) ---
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // --- MODAL & EDITING STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempSubjects, setTempSubjects] = useState([]); // Subjects currently being edited
  const [subjectSearchQuery, setSubjectSearchQuery] = useState(''); // Search inside the modal
  const [saving, setSaving] = useState(false);

  // --- MAIN DATA FETCHING ---
  useEffect(() => {
    fetchUsersSafe();
  }, [viewMode]);

  const fetchUsersSafe = async () => {
    setLoading(true);
    // Reset filter when switching tabs
    setUserSearchQuery('');
    try {
      const q = query(collection(db, "users"), where("role", "==", viewMode));
      const querySnapshot = await getDocs(q);
      const safeUserList = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        // Determine correct subject field based on role
        const subjectList = viewMode === 'faculty' 
            ? (data.allotedSubjects || []) 
            : (data.enrolledSubjects || []);

        safeUserList.push({
            id: docSnap.id,
            // SAFE FALLBACKS
            name: data.name || 'Unknown Name',
            email: data.email || 'No Email',
            department: data.department || 'N/A',
            semester: data.semester || 'N/A',
            rollNo: data.rollNo || '', // Keep empty if missing for easier searching
            role: data.role || viewMode,
            currentSubjects: Array.isArray(subjectList) ? subjectList : [] 
        });
      });

      setUsers(safeUserList);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Data Error", "Could not load the user list safely.");
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERING LOGIC (NEW) ---
  const filteredUsers = users.filter(user => {
      const queryStr = userSearchQuery.toLowerCase();
      const nameMatch = user.name.toLowerCase().includes(queryStr);
      const rollMatch = user.rollNo.toLowerCase().includes(queryStr);
      return nameMatch || rollMatch;
  });


  // --- MODAL FUNCTIONS ---

  const openEditModal = (user) => {
    setSelectedUser(user);
    setTempSubjects([...user.currentSubjects]);
    setSubjectSearchQuery('');
    setModalVisible(true);
  };

  const closeEditModal = () => {
    setModalVisible(false);
    setSelectedUser(null);
    setTempSubjects([]);
    Keyboard.dismiss();
  };

  const handleAddSubject = (subjectToAdd) => {
    if (!tempSubjects.includes(subjectToAdd)) {
        setTempSubjects([...tempSubjects, subjectToAdd]);
    }
    setSubjectSearchQuery(''); 
  };

  const handleRemoveSubject = (subjectToRemove) => {
    setTempSubjects(tempSubjects.filter(sub => sub !== subjectToRemove));
  };

  const saveChanges = async () => {
      if (!selectedUser) return;
      setSaving(true);
      try {
        const userRef = doc(db, "users", selectedUser.id);
        const fieldToUpdate = selectedUser.role === 'faculty' ? 'allotedSubjects' : 'enrolledSubjects';

        await updateDoc(userRef, {
            [fieldToUpdate]: tempSubjects
        });
        
        Alert.alert("Success", "Subject list updated successfully.");
        closeEditModal();
        fetchUsersSafe(); // Refresh list to show changes
      } catch (error) {
          console.error("Save error:", error);
          Alert.alert("Save Failed", error.message);
      } finally {
          setSaving(false);
      }
  };


  // --- RENDERING ---

  // Filter master list for the MODAL search
  const filteredMasterList = MASTER_SUBJECT_LIST.filter(sub => 
      sub.toLowerCase().includes(subjectSearchQuery.toLowerCase()) && 
      !tempSubjects.includes(sub) 
  );


  const renderUserCard = ({ item }) => {
    const isFaculty = viewMode === 'faculty';
    const subtitle = isFaculty 
        ? `${item.department} Dept.` 
        : `Sem ${item.semester} | Roll: ${item.rollNo || 'N/A'}`;

    return (
      <Card style={styles.userCard} mode="elevated">
        <Card.Content>
          <View style={styles.cardHeader}>
              <View style={styles.userInfo}>
                  <Avatar.Text size={42} label={item.name[0]?.toUpperCase() || '?'} style={{backgroundColor: isFaculty ? theme.colors.primary : theme.colors.secondary, marginRight: 12}} />
                  <View style={{flex: 1}}>
                      <Text variant="titleMedium" style={{fontWeight:'bold'}} numberOfLines={1}>{item.name}</Text>
                      <Text variant="bodySmall" style={{color:'gray'}} numberOfLines={1}>{subtitle}</Text>
                  </View>
              </View>
              <IconButton icon="pencil" mode="contained" containerColor={theme.colors.surfaceVariant} onPress={() => openEditModal(item)} />
          </View>
          
          <Divider style={{marginVertical: 12}}/>
          
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 8}}>
             <Text variant="bodySmall" style={{fontWeight:'bold', color: theme.colors.outline}}>
                {isFaculty ? "ALLOTED SUBJECTS:" : "ENROLLED SUBJECTS:"}
            </Text>
            <Text variant="labelSmall" style={{color: theme.colors.outline}}>{item.currentSubjects.length} items</Text>
          </View>
         
          
          <View style={styles.chipContainer}>
              {item.currentSubjects.length > 0 ? (
                  item.currentSubjects.map((sub, index) => (
                      <Chip key={index + sub} style={styles.displayChip} textStyle={{fontSize: 11}} compact>{sub}</Chip>
                  ))
              ) : (
                  <Text variant="bodySmall" style={{fontStyle:'italic', color:'gray', paddingVertical: 4}}>
                      No subjects assigned yet.
                  </Text>
              )}
          </View>
        </Card.Content>
      </Card>
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topContainer}>
        <SegmentedButtons
            value={viewMode}
            onValueChange={setViewMode}
            buttons={[
                { value: 'faculty', label: 'Faculty Staff', icon: 'account-tie' },
                { value: 'student', label: 'Students', icon: 'school' },
            ]}
            density="medium"
            style={{marginBottom: 15}}
        />
        {/* --- NEW SEARCH BAR --- */}
        <Searchbar
            placeholder={`Search ${viewMode === 'faculty' ? 'Faculty' : 'Students'} by name or ID...`}
            onChangeText={setUserSearchQuery}
            value={userSearchQuery}
            style={styles.mainSearch}
            inputStyle={{fontSize: 14}}
            elevation={1}
        />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <>
            {/* --- LIST HEADER WITH COUNTS --- */}
            <View style={styles.listHeader}>
                <Text variant="labelMedium" style={{color: theme.colors.secondary}}>
                    Showing {filteredUsers.length} of {users.length} {viewMode === 'faculty' ? 'Faculty' : 'Students'}
                </Text>
            </View>

            <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            renderItem={renderUserCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-search-outline" size={40} color="gray" />
                    <Text style={styles.emptyText}>
                        {userSearchQuery ? `No users found matching "${userSearchQuery}"` : `No ${viewMode} records found.`}
                    </Text>
                </View>
            }
            />
        </>
      )}

      {/* --- EDITING MODAL --- */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={closeEditModal} contentContainerStyle={styles.modalContainer}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalHeaderBar}>
                <Text variant="titleLarge" style={{fontWeight:'bold', flex: 1}}>
                    Manage Subjects
                </Text>
                <IconButton icon="close" onPress={closeEditModal} style={{marginRight:-10}}/>
            </View>
            <Text variant="bodyMedium" style={{marginBottom:15, color:'gray'}}>
                Editing: <Text style={{fontWeight:'bold'}}>{selectedUser?.name}</Text>
            </Text>

            <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                
                {/* 1. CURRENTLY ASSIGNED LIST */}
                <Text variant="titleMedium" style={styles.modalSectionTitle}>Currently Assigned ({tempSubjects.length}):</Text>
                <View style={styles.chipContainer}>
                    {tempSubjects.map((sub, index) => (
                        <Chip 
                            key={index + sub} 
                            style={styles.editChip} 
                            onClose={() => handleRemoveSubject(sub)} 
                            mode="flat"
                        >
                            {sub}
                        </Chip>
                    ))}
                    {tempSubjects.length === 0 && <Text style={styles.emptyChipText}>No subjects assigned.</Text>}
                </View>

                <Divider style={{marginVertical: 20}} />

                {/* 2. ADD NEW SUBJECT */}
                <Text variant="titleMedium" style={styles.modalSectionTitle}>Assign New Subject:</Text>
                <PaperInput
                    mode="outlined"
                    placeholder="Search master list (e.g., 'CS101')..."
                    value={subjectSearchQuery}
                    onChangeText={setSubjectSearchQuery}
                    right={<PaperInput.Icon icon="magnify" />}
                    style={styles.searchInput}
                    dense
                />

                {subjectSearchQuery.length > 0 && (
                    <View style={styles.suggestionsBox}>
                        {filteredMasterList.slice(0, 6).map((sub, index) => (
                            <TouchableOpacity key={index + sub} style={styles.suggestionItem} onPress={() => handleAddSubject(sub)}>
                                <MaterialCommunityIcons name="plus-box" size={20} color={theme.colors.primary} style={{marginRight: 12}}/>
                                <Text variant="bodyMedium">{sub}</Text>
                            </TouchableOpacity>
                        ))}
                        {filteredMasterList.length === 0 && <Text style={styles.noResultsText}>No matching subjects found in master list.</Text>}
                    </View>
                )}
            </ScrollView>

            <View style={styles.modalButtonBar}>
                <Button mode="outlined" onPress={closeEditModal} style={styles.modalButton}>Cancel</Button>
                <Button mode="contained" onPress={saveChanges} loading={saving} disabled={saving} style={styles.modalButton}>
                    {saving ? "Save Changes" : "Save Changes"}
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
  topContainer: { padding: 15, backgroundColor:'white', elevation: 1 },
  mainSearch: { backgroundColor: '#F5F7F8' },
  listHeader: { paddingHorizontal: 15, paddingVertical: 10 },
  listContent: { paddingHorizontal: 15, paddingBottom: 30 },
  emptyContainer: { alignItems:'center', justifyContent:'center', marginTop: 50, opacity: 0.6 },
  emptyText: { textAlign:'center', marginTop: 10, fontSize: 16 },
  
  // User Card
  userCard: { marginBottom: 12, backgroundColor: 'white', borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection:'row', alignItems:'center', flex: 1, marginRight: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  displayChip: { backgroundColor: '#F0F4F8', height: 32 },

  // Modal
  modalContainer: { backgroundColor: 'white', margin: 20, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalHeaderBar: { flexDirection:'row', alignItems:'center', marginBottom: 5 },
  modalScrollView: { maxHeight: 400 },
  modalSectionTitle: { fontWeight:'bold', marginBottom: 10, fontSize: 16 },
  editChip: { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' },
  emptyChipText: { color:'#90A4AE', fontStyle:'italic', padding: 5 },
  searchInput: { backgroundColor: 'white', marginBottom: 10 },
  
  // Suggestions
  suggestionsBox: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor:'#FAFAFA', overflow:'hidden' },
  suggestionItem: { flexDirection:'row', alignItems:'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  noResultsText: { padding: 15, color:'gray', fontStyle:'italic', textAlign:'center' },

  modalButtonBar: { flexDirection: 'row', marginTop: 20, gap: 10 },
  modalButton: { flex: 1 },
});