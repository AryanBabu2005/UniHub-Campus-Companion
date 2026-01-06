import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Avatar, List, RadioButton, useTheme, Divider } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { auth, db } from '../../firebaseconfig';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';

export default function NewReportScreen() {
  const theme = useTheme();
  const [initialLoading, setInitialLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [mySubjects, setMySubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // 1. Fetch Subjects for the Faculty on Component Mount
  const fetchFacultySubjects = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get Faculty's College and Department
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        Alert.alert("Error", "Faculty profile not found.");
        return;
      }
      const { college, department } = userDoc.data();

      // Query for subjects matching their college & department
      const q = query(
        collection(db, "meta_subjects"),
        where("college", "==", college),
        where("dept", "==", department)
      );
      const querySnapshot = await getDocs(q);
      const subjects = [];
      querySnapshot.forEach((doc) => {
        subjects.push({ id: doc.id, ...doc.data() });
      });
      setMySubjects(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      Alert.alert("Error", "Could not load your subject list.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacultySubjects();
  }, [fetchFacultySubjects]);


  // 2. Generate and Share the CSV Report (CORRECTED LOGIC)
  const generateReport = async () => {
    const selectedSubject = mySubjects.find(sub => sub.id === selectedSubjectId);
    if (!selectedSubject) return;

    setReportLoading(true);
    try {
      // --- A. Query the correct collection: 'attendance_sessions' ---
      const searchCode = selectedSubject.code.trim();
      const q = query(
        collection(db, "attendance_sessions"),
        where("subjectCode", "==", searchCode),
        orderBy("date", "desc") // Optional: order results by date
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("No Data", `No attendance sessions found for ${selectedSubject.name} (${searchCode}).`);
        setReportLoading(false);
        return;
      }

      // --- B. Initialize CSV Rows Array with Header ---
      let csvRows = [];
      csvRows.push("Date,Session ID,Total Students,Present Count,Student Attendance Details (Roll: Status)");

      // --- C. Iterate through each Session Document ---
      snapshot.forEach((docSnap) => {
        const sessionData = docSnap.data();
        const sessionId = docSnap.id; // e.g., VAC01_2025-12-04

        // 1. Format Date
        let dateStr = "Unknown Date";
        if (sessionData.date && sessionData.date.toDate) {
          dateStr = sessionData.date.toDate().toLocaleDateString() + ' ' + sessionData.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // 2. Access the array of student records within this session document
        const studentRecords = sessionData.attendanceRecord || [];
        const totalStudents = studentRecords.length;
        let presentCount = 0;
        let studentDetailsList = [];

        // 3. Iterate through student records array to process each student
        studentRecords.forEach(record => {
           // Determine Status String based on hourly data or fallback to old status
           let statusStr = record.status;
           if (record.attendedHours !== undefined && record.totalSubjectHours !== undefined) {
               // Hourly logic
               statusStr = `${record.attendedHours}/${record.totalSubjectHours} Hrs`;
               if (record.attendedHours > 0) presentCount++;
           } else {
               // Fallback for older data format
               statusStr = record.status || (record.present ? 'Present' : 'Absent');
               if (statusStr === 'Present' || record.present === true) presentCount++;
           }

           // Add formatted student detail to temp list
           studentDetailsList.push(`${record.studentName} (${record.rollNo || 'N/A'}): ${statusStr}`);
        });

        // 4. Create the CSV row for this session
        // Join student details with semi-colon and wrap in quotes to handle commas safely in CSV
        const detailsJoined = `"${studentDetailsList.join('; ')}"`;
        csvRows.push(`${dateStr},${sessionId},${totalStudents},${presentCount},${detailsJoined}`);
      });


      // --- D. Join all rows to create final CSV content ---
      const csvContent = csvRows.join('\n');


      // --- E. Create and Share File using Expo FileSystem API ---
      const safeName = selectedSubject.code.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${safeName}_Attendance_Report.csv`;

      // 1. Create the file path in the cache directory (or document directory)
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // 2. Write the CSV content to the file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 3. Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Share Report for ${selectedSubject.code}`,
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }

    } catch (error) {
      console.error("Report Generation Error:", error);
      // Show the actual error message for better debugging
      Alert.alert("Failed to Generate Report", error.message);
    } finally {
      setReportLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContainer}>
        <Avatar.Icon size={64} icon="file-chart-outline" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>Generate Attendance Report</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Select a subject to export its session data.</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Your Subjects</Text>
          <Divider style={{ marginBottom: 8 }} />
          {mySubjects.length === 0 ? (
            <Text style={styles.emptyText}>No subjects found linked to your department.</Text>
          ) : (
            <RadioButton.Group onValueChange={setSelectedSubjectId} value={selectedSubjectId}>
              {mySubjects.map((subject) => (
                <List.Item
                  key={subject.id}
                  title={subject.name}
                  description={`Code: ${subject.code}`}
                  left={() => <RadioButton value={subject.id} />}
                  style={styles.listItem}
                  onPress={() => setSelectedSubjectId(subject.id)}
                />
              ))}
            </RadioButton.Group>
          )}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          icon="download-outline"
          onPress={generateReport}
          loading={reportLoading}
          disabled={!selectedSubjectId || reportLoading}
          contentStyle={{ height: 56 }}
          labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
        >
          {reportLoading ? "Generating..." : "Download CSV Report"}
        </Button>
        <Text variant="bodySmall" style={styles.helpText}>
          The report will include attendance data from all recorded sessions matching the subject code in the 'attendance_sessions' collection.
        </Text>
      </View>
      <View style={{height: 40}}/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  card: { marginBottom: 24, borderRadius: 12, elevation: 2 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8 },
  listItem: { paddingVertical: 8 },
  emptyText: { fontStyle: 'italic', color: 'gray', paddingVertical: 16, textAlign: 'center' },
  buttonContainer: { marginTop: 'auto' },
  helpText: { textAlign: 'center', color: 'gray', marginTop: 12, paddingHorizontal: 10 },
});