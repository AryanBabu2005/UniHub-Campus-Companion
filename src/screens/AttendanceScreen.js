import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Avatar, IconButton, SegmentedButtons, ActivityIndicator, Searchbar, Banner, Portal, Modal, Divider } from 'react-native-paper';
import { db } from '../../firebaseconfig'; 
import { collection, serverTimestamp, query, where, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

export default function AttendanceScreen({ route, navigation }) {
  const { preSelectedSubject } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duration, setDuration] = useState('1'); 
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // State for Student Profile Modal
  const [visible, setVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // 1. MONITOR NETWORK (Offline Detection)
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
        setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // 2. FETCH STUDENTS (With Offline Cache)
  useEffect(() => {
    if (!preSelectedSubject) { Alert.alert("Error", "No subject selected."); return; }
    
    setLoading(true);
    
    const q = query(
      collection(db, "users"), 
      where("role", "==", "student"),
      where("enrolledSubjects", "array-contains", preSelectedSubject.code)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const realStudents = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        realStudents.push({
          id: doc.id,
          name: data.name ? data.name : data.email.split('@')[0], 
          email: data.email,
          attendedHours: parseInt(duration), // Default: Full attendance
          // Include other student data for profile view
          rollNo: data.rollNo || 'Not set',
          phone: data.phone || 'Not set',
          dob: data.dob ? data.dob.toDate().toDateString() : 'Not set',
          college: data.college || 'N/A',
          department: data.department || 'N/A',
          semester: data.semester || 'N/A',
        });
      });
      setStudents(realStudents);
      setFilteredStudents(realStudents);
      setLoading(false);
    }, (error) => {
      console.log("Offline or Error:", error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [preSelectedSubject]);

  // 3. LOGIC HANDLERS
  const handleDurationChange = (newVal) => {
    setDuration(newVal);
    const newMax = parseInt(newVal);
    const update = (list) => list.map(s => ({ ...s, attendedHours: s.attendedHours > 0 ? newMax : 0 }));
    setStudents(prev => update(prev));
    setFilteredStudents(prev => update(prev));
  };

  const onChangeSearch = query => {
    setSearchQuery(query);
    if (query) {
        setFilteredStudents(students.filter(s => s.name.toLowerCase().includes(query.toLowerCase())));
    } else {
        setFilteredStudents(students);
    }
  };

  const adjustHours = (id, delta) => {
    const maxHours = parseInt(duration);
    const update = (list) => list.map(s => {
        if (s.id !== id) return s;
        let newHours = s.attendedHours + delta;
        if (newHours < 0) newHours = 0;
        if (newHours > maxHours) newHours = maxHours;
        return { ...s, attendedHours: newHours };
    });
    setStudents(prev => update(prev));
    setFilteredStudents(prev => update(prev));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const uniqueSessionId = `${preSelectedSubject.code}_${dateStr}`;
      
      if (!isOffline) {
          const duplicateCheck = await getDoc(doc(db, "attendance_sessions", uniqueSessionId));
          if (duplicateCheck.exists()) { Alert.alert("Stop", "Attendance already marked!"); setSubmitting(false); return; }
      }

      const sessionData = {
        subject: preSelectedSubject.name,
        subjectCode: preSelectedSubject.code,
        date: serverTimestamp(),
        dateString: dateStr,
        duration: parseInt(duration),
        totalStudents: students.length,
        totalHoursGiven: students.reduce((acc, curr) => acc + curr.attendedHours, 0),
        attendanceRecord: students.map(s => ({
          studentId: s.id, 
          name: s.name,
          status: s.attendedHours === 0 ? 'Absent' : (s.attendedHours < parseInt(duration) ? 'Partial' : 'Present'),
          attendedHours: s.attendedHours, 
          maxHours: parseInt(duration)
        }))
      };

      await setDoc(doc(db, "attendance_sessions", uniqueSessionId), sessionData);
      
      Alert.alert(
          isOffline ? "Saved to Device 💾" : "Saved to Cloud ☁️", 
          isOffline ? "Data will auto-sync when internet returns." : "Attendance marked successfully!"
      );
      navigation.goBack(); 

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (hours) => {
      if (hours === 0) return '#E0E0E0'; 
      if (hours < parseInt(duration)) return '#FFB74D'; 
      return '#66BB6A'; 
  };

  // Function to open the profile modal
  const showStudentProfile = (student) => {
    setSelectedStudent(student);
    setVisible(true);
  };

  return (
    <View style={styles.container}>
      
      {/* OFFLINE BANNER */}
      <Banner visible={isOffline} icon="wifi-off" style={{backgroundColor: '#FFEBEE'}}>
        Offline Mode: Attendance will be saved locally.
      </Banner>

      <Card style={styles.selectionCard}>
        <Card.Title 
            title={preSelectedSubject ? preSelectedSubject.name : "Loading..."}
            subtitle={new Date().toDateString()}
            left={(props) => <Avatar.Icon {...props} icon="notebook-check" style={{backgroundColor: '#6200ee'}} />}
        />
      </Card>

      <View style={styles.controls}>
        <Searchbar 
            placeholder="Search Name..." 
            onChangeText={onChangeSearch} 
            value={searchQuery} 
            style={styles.search} 
            inputStyle={{minHeight: 0}} 
        />
        
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:10}}>
            <Text style={{fontWeight:'bold', fontSize:12}}>Max Credits:</Text>
            <SegmentedButtons 
                value={duration} 
                onValueChange={handleDurationChange} 
                buttons={[{ value: '1', label: '1 Hr' }, { value: '2', label: '2 Hrs' }, { value: '3', label: '3 Hrs' }]} 
                density="small"
            />
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" style={{marginTop:50}} /> : (
        <ScrollView style={styles.listContainer}>
            {filteredStudents.length === 0 && <Text style={{textAlign:'center', marginTop:20}}>No students found.</Text>}
            
            {filteredStudents.map((student) => (
            <Card key={student.id} style={[styles.studentCard, {borderLeftWidth: 5, borderLeftColor: getStatusColor(student.attendedHours)}]}>
                <View style={styles.cardRow}>
                    
                    {/* AVATAR + NAME - NOW CLICKABLE */}
                    <TouchableOpacity style={{flex:1, flexDirection:'row', alignItems:'center'}} onPress={() => showStudentProfile(student)}>
                        <Avatar.Text 
                            size={40} 
                            label={student.name.substring(0,2).toUpperCase()} 
                            style={{marginRight:10, backgroundColor: '#6200ee'}} 
                            color="white"
                        />
                        <View>
                            <Text variant="titleMedium" style={{fontWeight:'bold', fontSize: 16, textDecorationLine: 'underline'}}>
                                {student.name}
                            </Text>
                            <Text variant="bodySmall" style={{color:'gray'}}>{student.rollNo !== 'Not set' ? `Roll: ${student.rollNo}` : student.email}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* STEPPER */}
                    <View style={styles.stepper}>
                        <IconButton icon="minus" size={20} onPress={() => adjustHours(student.id, -1)} />
                        <Text style={{fontWeight:'bold', fontSize:16, width:20, textAlign:'center'}}>
                            {student.attendedHours}
                        </Text>
                        <IconButton icon="plus" size={20} iconColor="#6200ee" onPress={() => adjustHours(student.id, 1)} />
                    </View>

                </View>
            </Card>
            ))}
            <View style={{height: 80}}/>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button mode="contained" onPress={handleSubmit} loading={submitting} contentStyle={{height: 50}}>
            {isOffline ? "Save Offline" : "Submit Register"}
        </Button>
      </View>

      {/* --- STUDENT PROFILE MODAL --- */}
      <Portal>
          <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modalContainer}>
              {selectedStudent && (
                  <View>
                       <View style={styles.modalHeader}>
                          <Text variant="headlineSmall" style={{fontWeight:'bold'}}>{selectedStudent.name}</Text>
                          <IconButton icon="close" onPress={() => setVisible(false)} />
                       </View>
                       
                       <View style={{alignItems:'center', marginVertical: 20}}>
                          <Avatar.Text size={80} label={selectedStudent.name[0].toUpperCase()} style={{backgroundColor: '#6200ee'}} />
                       </View>

                       <Divider style={{marginBottom: 15}} />
                       <ProfileDetailRow icon="card-account-details-outline" label="Roll Number" value={selectedStudent.rollNo} isMaterialIcon />
                       <ProfileDetailRow icon="email-outline" label="Email" value={selectedStudent.email} isMaterialIcon />
                       <ProfileDetailRow icon="phone" label="Phone" value={selectedStudent.phone} isMaterialIcon selectable />
                       <ProfileDetailRow icon="cake-variant-outline" label="Date of Birth" value={selectedStudent.dob} isMaterialIcon />
                       
                       <Divider style={{marginVertical: 15}} />
                       <ProfileDetailRow icon="🏛️" label="College" value={selectedStudent.college} />
                       <ProfileDetailRow icon="📚" label="Department" value={selectedStudent.department} />
                       <ProfileDetailRow icon="📅" label="Semester" value={selectedStudent.semester} />

                  </View>
              )}
          </Modal>
      </Portal>
    </View>
  );
}

// Helper component for profile details in modal
const ProfileDetailRow = ({ icon, label, value, isMaterialIcon, selectable }) => (
    <View style={styles.detailRow}>
        {isMaterialIcon ? <IconButton icon={icon} size={24} style={{margin:0, marginRight: 10}} /> : <Text style={{fontSize:22, marginRight: 15}}>{icon}</Text>}
        <View style={{flex: 1}}>
            <Text variant="labelMedium" style={{color:'gray'}}>{label}</Text>
            <Text variant="bodyLarge" selectable={selectable} style={{fontWeight: value === 'Not set' ? 'normal' : '500', color: value === 'Not set' ? 'gray' : 'black'}}>
                {value}
            </Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  selectionCard: { margin: 15, marginBottom: 5, backgroundColor:'white' },
  controls: { paddingHorizontal: 15, marginBottom: 10 },
  search: { backgroundColor: 'white' },
  listContainer: { flex: 1, paddingHorizontal: 15 },
  studentCard: { marginBottom: 10, backgroundColor: 'white', borderRadius: 8, padding: 5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 20, borderWidth:1, borderColor:'#eee' },
  footer: { padding: 20, backgroundColor: 'white', elevation: 10 },
  // --- MODAL STYLES ---
  modalContainer: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 15 },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
});