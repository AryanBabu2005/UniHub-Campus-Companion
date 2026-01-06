import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, Avatar, ActivityIndicator, IconButton, useTheme, Surface } from 'react-native-paper';
// FIXED: camelCase 'firebaseConfig' matches the file we created
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function FacultyDashboard({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [mySubjects, setMySubjects] = useState([]);

  // --- LOGOUT LOGIC ---
  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to sign out of the faculty portal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              // JUST SIGN OUT. App.js handles the navigation automatically.
              await auth.signOut();
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const fetchProfileAndSubjects = async () => {
        const user = auth.currentUser;
        if(user) {
            try {
                // 1. Get Faculty Profile
                const docSnap = await getDoc(doc(db, "users", user.uid));

                if(docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(data);

                    // 2. REAL WORLD FETCH: Query 'meta_subjects' collection
                    const q = query(
                        collection(db, "meta_subjects"),
                        where("college", "==", data.college),
                        where("dept", "==", data.department)
                    );

                    const subSnap = await getDocs(q);
                    const fetchedSubjects = [];
                    subSnap.forEach(doc => {
                        fetchedSubjects.push(doc.data());
                    });

                    setMySubjects(fetchedSubjects);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                Alert.alert("Error", "Could not load your profile data.");
            }
        }
        setLoading(false);
    };

    fetchProfileAndSubjects();
  }, []);

  if(loading) {
      return (
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{marginTop:10, color: theme.colors.onBackground}}>Loading portal...</Text>
        </View>
      );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ENGINEERED HEADER */}
      <Surface style={[styles.headerSurface, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={{fontWeight:'800', color: theme.colors.primary}}>
                    {profile?.college || "Institute Portal"}
                </Text>
                <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant, fontWeight: '600'}}>
                    {profile?.department ? `${profile.department} Department` : "Faculty"}
                </Text>
            </View>
            <IconButton
                icon="power"
                iconColor={theme.colors.error}
                size={26}
                onPress={handleLogout}
            />
        </View>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* SECTION 1: MY CLASSES */}
          <Text variant="titleMedium" style={[styles.sectionTitle, {color: theme.colors.onBackground}]}>Teaching Schedule</Text>

          {mySubjects.length === 0 ? (
              <Card style={styles.card} elevation={0}>
                  <Card.Content style={{alignItems:'center', padding: 20}}>
                      <Avatar.Icon size={48} icon="book-cancel-outline" style={{backgroundColor: theme.colors.surfaceVariant}} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodyLarge" style={{marginTop: 10, fontWeight: 'bold', color: theme.colors.onSurface}}>No Subjects Assigned</Text>
                      <Text variant="bodyMedium" style={{textAlign:'center', marginTop: 5, color: theme.colors.onSurfaceVariant}}>
                          Contact your administrator if this is an error.
                      </Text>
                  </Card.Content>
              </Card>
          ) : (
              mySubjects.map((sub, index) => (
                  <Card
                      key={index}
                      style={styles.card}
                      elevation={1}
                      // --- FIX: Changed navigation name to 'AttendanceTab' ---
                      onPress={() => navigation.navigate('AttendanceTab', {
                          preSelectedSubject: sub
                      })}
                  >
                      <Card.Title
                          title={sub.name}
                          titleStyle={{fontWeight: '700'}}
                          subtitle={`Code: ${sub.code} • Semester ${sub.sem}`}
                          left={props => <Avatar.Icon {...props} icon="book-education-outline" style={{backgroundColor: theme.colors.primaryContainer}} color={theme.colors.primary} />}
                          right={props => <IconButton {...props} icon="chevron-right" iconColor={theme.colors.onSurfaceVariant} />}
                      />
                  </Card>
              ))
          )}

          {/* SECTION 2: ADMIN TOOLS */}
          <Text variant="titleMedium" style={[styles.sectionTitle, {color: theme.colors.onBackground}]}>Management Tools</Text>

          {/* ROW 1 */}
          <View style={styles.grid}>
              <ToolCard
                  title="Upload Notes"
                  icon="cloud-upload-outline"
                  color="#03dac6"
                  // --- FIX: Changed navigation name to 'UploadTab' ---
                  onPress={() => navigation.navigate('UploadTab')}
                  theme={theme}
              />
              <ToolCard
                  title="Reports"
                  icon="file-chart-outline"
                  color="#4CAF50"
                  // Reports is a stack screen, so this name is correct
                  onPress={() => navigation.navigate('Reports')}
                  theme={theme}
              />
              <ToolCard
                  title="Broadcast"
                  icon="bullhorn-outline"
                  color="#FF9800"
                  // --- FIX: Changed navigation name to 'BroadcastTab' ---
                  onPress={() => navigation.navigate('BroadcastTab')}
                  theme={theme}
              />
          </View>
          
          {/* ROW 2 (New) */}
          <View style={[styles.grid, { marginTop: 12, justifyContent: 'flex-start' }]}>
              {/* --- NEW TOOL CARD FOR ENTERTAINMENT --- */}
              <ToolCard
                  title="Entertainment & Events"
                  icon="party-popper"
                  color="#E91E63" // A nice pink/red color for events
                  // Entertainment is a stack screen, so this name is correct
                  onPress={() => navigation.navigate('Entertainment')}
                  theme={theme}
              />
              {/* Add more tools here in the future */}
          </View>

          <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

// Reusable Tool Card Component for cleaner code
const ToolCard = ({ title, icon, color, onPress, theme }) => (
    <Card style={styles.toolCard} onPress={onPress} elevation={1}>
        <Card.Content style={styles.toolCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Avatar.Icon size={32} icon={icon} style={{backgroundColor: 'transparent'}} color={color} />
            </View>
            <Text variant="labelMedium" style={styles.toolText}>{title}</Text>
        </Card.Content>
    </Card>
);


const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent:'center', alignItems:'center' },
  headerSurface: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10 // Adjust for status bar
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 10,
    fontWeight:'700',
  },
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  toolCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 16,
    marginRight: '3.5%' // Add slight margin for when it's not the last item in a row
  },
  toolCardContent: {
      alignItems: 'center',
      paddingVertical: 16,
  },
  iconContainer: {
      padding: 8,
      borderRadius: 50,
      marginBottom: 8,
  },
  toolText: {
    fontWeight: '600',
    textAlign: 'center'
  }
});