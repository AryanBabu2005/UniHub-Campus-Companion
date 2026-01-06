import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, Avatar, ActivityIndicator, Chip, useTheme, ProgressBar, IconButton, Switch, Divider } from 'react-native-paper';
import { auth, db, storage } from '../../firebaseconfig'; 
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as DocumentPicker from 'expo-document-picker';

export default function UploadResourceScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [profile, setProfile] = useState(null);
  const [mySubjects, setMySubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // --- NEW STATE FOR GENERAL RESOURCES ---
  const [isGeneralResource, setIsGeneralResource] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceLink, setResourceLink] = useState(''); 
  const [pickedFile, setPickedFile] = useState(null);

  useEffect(() => {
    const fetchFields = async () => {
      const user = auth.currentUser;
      if(user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if(docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          
          const q = query(
              collection(db, "meta_subjects"),
              where("college", "==", data.college),
              where("dept", "==", data.department)
          );
          const subSnap = await getDocs(q);
          setMySubjects(subSnap.docs.map(d => d.data()));
        }
      }
      setLoading(false);
    };
    fetchFields();
  }, []);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
            'application/vnd.ms-powerpoint', 
            'image/jpeg', 
            'image/png'
        ],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setPickedFile(result.assets[0]);
        setResourceLink(''); 
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const removePickedFile = () => {
      setPickedFile(null);
  };

  // --- UPDATED STORAGE LOGIC ---
  const uploadFileToStorage = async (file) => {
    if (!file) return null;

    // Determine folder based on whether it's general or subject-specific
    let folderName = selectedSubject ? selectedSubject.code : 'general_uploads';
    if (isGeneralResource && profile) {
        // Use department name to organize general uploads, removing spaces
        folderName = `general_${profile.department.replace(/\s+/g, '')}`;
    }

    const fileName = `${folderName}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, 'uploads/' + fileName);

    const response = await fetch(file.uri);
    const blob = await response.blob();
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes);
          setUploadProgress(progress);
        }, 
        (error) => { reject(error); }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  // --- UPDATED UPLOAD HANDLER ---
  const handleUpload = async () => {
    // Validation: Must have Title AND (Selected Subject OR be a General Resource)
    if (!title || (!selectedSubject && !isGeneralResource)) {
      Alert.alert("Missing Info", "Please provide a title and either select a subject or mark as a General Resource.");
      return;
    }
    
    if (!pickedFile && !resourceLink) {
        Alert.alert("Missing Resource", "Please either provide a link or pick a file.");
        return;
    }

    setUploading(true);
    setUploadProgress(0); 

    try {
      let finalUrl = resourceLink;
      if (pickedFile) {
        finalUrl = await uploadFileToStorage(pickedFile);
      }

      // --- PREPARE FIRESTORE DATA ---
      const resourceData = {
        title: title,
        description: description || "",
        link: finalUrl, 
        type: pickedFile ? 'pdf' : 'link',
        college: profile.college,
        department: profile.department,
        facultyName: profile.name,
        facultyId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        // --- NEW LOGIC FOR GENERAL VS SUBJECT ---
        isGeneral: isGeneralResource, // Boolean flag for easy querying
        subjectCode: isGeneralResource ? 'GENERAL' : selectedSubject.code,
        subjectName: isGeneralResource ? 'General Resource' : selectedSubject.name,
      };

      await addDoc(collection(db, "academic_resources"), resourceData);

      Alert.alert("Success!", "Resource posted successfully.");
      navigation.goBack();

    } catch (error) {
      Alert.alert("Error", "Failed to upload: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setPickedFile(null);
    }
  };

  // --- NEW HANDLER FOR TOGGLING ---
  const toggleGeneralResource = (val) => {
      setIsGeneralResource(val);
      if (val) {
          // If turning ON general resource, clear selected subject
          setSelectedSubject(null);
      }
  }


  if(loading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      <Card style={styles.card} elevation={1}>
        <Card.Title 
            title="Share Material" 
            subtitle={isGeneralResource ? "Posting to everyone in department" : `Posting for a specific subject`}
            left={props => <Avatar.Icon {...props} icon={isGeneralResource ? "bullhorn" : "book-open-variant"} style={{backgroundColor: isGeneralResource ? theme.colors.secondary : theme.colors.primary}} />}
        />
        <Card.Content>
            
            {/* --- NEW: General Resource Toggle --- */}
            <View style={styles.switchContainer}>
                <Text variant="bodyMedium" style={{flex: 1, fontWeight: 'bold'}}>
                    Is this a General Resource? {"\n"}
                    <Text variant="labelSmall" style={{color:'gray'}}>(e.g., Datesheet, Timetable, Notice)</Text>
                </Text>
                <Switch value={isGeneralResource} onValueChange={toggleGeneralResource} color={theme.colors.primary} />
            </View>
            <Divider style={{marginBottom: 15}} />

            {/* 1. Subject Selection (Disabled if General Resource is ON) */}
            <Text variant="bodyMedium" style={{fontWeight:'bold', marginBottom:10, color: isGeneralResource ? 'gray' : theme.colors.onSurface}}>
                Select Subject {isGeneralResource ? "(Disabled)" : ""}:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                {mySubjects.map((sub, index) => (
                    <Chip 
                        key={index} 
                        mode="outlined" 
                        selected={selectedSubject?.code === sub.code}
                        disabled={isGeneralResource} // Disable chips if general is on
                        onPress={() => setSelectedSubject(sub)}
                        style={{marginRight: 10, backgroundColor: selectedSubject?.code === sub.code ? theme.colors.primaryContainer : 'transparent', opacity: isGeneralResource ? 0.5 : 1}}
                        textStyle={{color: selectedSubject?.code === sub.code ? theme.colors.primary : theme.colors.onSurface}}
                    >
                        {sub.code}
                    </Chip>
                ))}
            </ScrollView>
            
            {/* 2. Resource Details */}
            <TextInput 
                label="Title (e.g., Final Datesheet)" 
                value={title} 
                onChangeText={setTitle} 
                mode="outlined" 
                style={styles.input} 
            />
            <TextInput 
                label="Description (Optional)" 
                value={description} 
                onChangeText={setDescription} 
                mode="outlined" 
                multiline numberOfLines={3} 
                style={styles.input} 
            />
            
            {/* 3. File Link / Upload Selection (Same as before) */}
            <View style={{marginBottom: 15}}>
                <Text variant="bodyMedium" style={{fontWeight:'bold', marginBottom: 10}}>Resource File:</Text>
                 <Button 
                    mode={pickedFile ? "contained" : "outlined"}
                    icon="file-document-outline"
                    onPress={pickDocument}
                    style={{marginBottom: 10, borderColor: theme.colors.primary}}
                    textColor={pickedFile ? theme.colors.onPrimary : theme.colors.primary}
                >
                    {pickedFile ? "Change File" : "Pick File (PDF, Word, PPT, Image)"}
                </Button>

                {pickedFile && (
                    <View style={styles.selectedFileContainer}>
                        <View style={{flex: 1}}>
                            <Text variant="bodyMedium" numberOfLines={1} style={{fontWeight: 'bold'}}>Selected: {pickedFile.name}</Text>
                            <Text variant="labelSmall" style={{color: 'gray'}}>{(pickedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
                        </View>
                        <IconButton icon="close-circle-outline" iconColor={theme.colors.error} size={24} onPress={removePickedFile} />
                    </View>
                )}

                <Text style={{textAlign:'center', color:'gray', marginVertical: 5}}>- OR -</Text>

                <TextInput 
                    label="Paste External Link" 
                    value={resourceLink} 
                    onChangeText={text => { setResourceLink(text); if(text) setPickedFile(null); }} 
                    mode="outlined" 
                    style={styles.input}
                    disabled={!!pickedFile}
                />
            </View>

            {uploading && pickedFile && (
                <View style={{marginBottom: 20}}>
                    <ProgressBar progress={uploadProgress} color={theme.colors.primary} style={{height: 8, borderRadius: 5}} />
                    <Text style={{textAlign:'center', marginTop: 5}}>{Math.round(uploadProgress * 100)}% Uploaded</Text>
                </View>
            )}

            {/* Submit Button - Enabled if Title exists AND (Subject selected OR General is ON) */}
            <Button 
                mode="contained" 
                onPress={handleUpload} 
                loading={uploading} 
                disabled={uploading || !title || (!selectedSubject && !isGeneralResource)}
                contentStyle={{height: 50}}
            >
                {uploading ? "Uploading..." : "Post Resource"}
            </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 16, backgroundColor: 'white', marginBottom: 20 },
  input: { marginBottom: 15, backgroundColor:'white' },
  selectedFileContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, marginBottom: 10
  },
  // --- NEW STYLE ---
  switchContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15,
  }
});