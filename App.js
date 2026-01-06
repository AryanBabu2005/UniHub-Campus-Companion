import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme, useTheme } from 'react-native-paper';
import { auth, db } from './firebaseconfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- IMPORT SCREENS ---
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import StudentDashboard from './src/screens/StudentDashboard';
import FacultyDashboard from './src/screens/FacultyDashboard';
import AttendanceScreen from './src/screens/AttendanceScreen';
import UploadResourceScreen from './src/screens/UploadResourceScreen';
import AcademicDashboard from './src/screens/AcademicDashboard';
import EntertainmentScreen from './src/screens/EntertainmentScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewReportScreen from './src/screens/NewReportScreen';
import BroadcastScreen from './src/screens/BroadcastScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AdminScreen from './src/screens/AdminScreen';
import DiscussionForumScreen from './src/screens/DiscussionForumScreen';
import CategoryPostsScreen from './src/screens/CategoryPostsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
// Import the detailed attendance screen



const Stack = createNativeStackNavigator();
const StudentTab = createBottomTabNavigator();
const FacultyTab = createBottomTabNavigator();
const StudentForumStack = createNativeStackNavigator();

// --- THEME ---
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2A4D69',
    secondary: '#4B86B4',
    background: '#F7F9FC',
  },
};

// --- STUDENT DISCUSSION STACK ---
function DiscussionForumStack() {
  return (
    <StudentForumStack.Navigator>
      <StudentForumStack.Screen name="DiscussionForum" component={DiscussionForumScreen} options={{ headerShown: false }} />
      <StudentForumStack.Screen name="CategoryPosts" component={CategoryPostsScreen} options={{ title: 'Posts' }} />
    </StudentForumStack.Navigator>
  );
}

// --- STUDENT TAB NAVIGATOR ---
function StudentTabNavigator() {
  const theme = useTheme();
  return (
    <StudentTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: { borderTopColor: theme.colors.outline, backgroundColor: theme.colors.surface },
      }}
    >
      <StudentTab.Screen
        name="StudentHomeTab"
        component={StudentDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home-variant-outline" color={color} size={24} />,
        }}
      />
      <StudentTab.Screen
        name="AcademicTab"
        component={AcademicDashboard}
        options={{
          tabBarLabel: 'Academic',
          tabBarIcon: ({ color }) => <Icon name="book-open-page-variant-outline" color={color} size={24} />,
        }}
      />
      <StudentTab.Screen
        name="DiscussionForumTab"
        component={DiscussionForumStack}
        options={{
          tabBarLabel: 'Forum',
          tabBarIcon: ({ color }) => <Icon name="forum-outline" color={color} size={24} />,
        }}
      />
      <StudentTab.Screen
        name="EntertainmentTab"
        component={EntertainmentScreen}
        options={{
          tabBarLabel: 'Chill Zone',
          tabBarIcon: ({ color }) => <Icon name="gamepad-variant-outline" color={color} size={24} />,
        }}
      />
      <StudentTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="account-circle-outline" color={color} size={24} />,
        }}
      />
    </StudentTab.Navigator>
  );
}

// --- FACULTY TAB NAVIGATOR ---
function FacultyTabNavigator() {
  const theme = useTheme();
  return (
    <FacultyTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: { borderTopColor: theme.colors.outline, backgroundColor: theme.colors.surface },
      }}
    >
      <FacultyTab.Screen
        name="FacultyHomeTab"
        component={FacultyDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home-variant-outline" color={color} size={24} />,
        }}
      />
      <FacultyTab.Screen
        name="AttendanceTab" 
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <Icon name="calendar-check-outline" color={color} size={24} />,
        }}
      />
       <FacultyTab.Screen
        name="UploadTab"
        component={UploadResourceScreen}
        options={{
          tabBarLabel: 'Upload',
          tabBarIcon: ({ color }) => <Icon name="cloud-upload-outline" color={color} size={24} />,
        }}
      />
      <FacultyTab.Screen
        name="BroadcastTab"
        component={BroadcastScreen}
        options={{
          tabBarLabel: 'Broadcast',
          tabBarIcon: ({ color }) => <Icon name="bullhorn-outline" color={color} size={24} />,
        }}
      />
      <FacultyTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="account-circle-outline" color={color} size={24} />,
        }}
      />
    </FacultyTab.Navigator>
  );
}


export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    let firestoreUnsubscribe;

    // 1. Listen for Auth changes (Login/Logout)
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }

      if (currentUser) {
        // 2. User is logged in. Start listening to their Firestore document.
        const docRef = doc(db, 'users', currentUser.uid);
        
        firestoreUnsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setRole(data.role);
              if (data.isProfileComplete && data.role && data.college && data.name) {
                 setIsProfileComplete(true);
              } else {
                 setIsProfileComplete(false);
              }
            } else {
                setRole(null);
                setIsProfileComplete(false);
            }
            setLoading(false);
        }, (error) => {
            console.error("Firestore listener error:", error);
            setRole(null);
            setIsProfileComplete(false);
            setLoading(false);
        });

      } else {
        // 3. User logged out. Reset state.
        setRole(null);
        setIsProfileComplete(false);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.primary }, headerTintColor: '#fff' }}>
          {!user ? (
            // --- STACK FOR LOGGED-OUT USERS ---
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              {/* MOVED ADMINPANEL HERE SO IT IS ACCESSIBLE FROM LOGIN SCREEN */}
              <Stack.Screen name="AdminPanel" component={AdminScreen} options={{ title: 'Super Admin Portal' }} />
            </>
          ) : !isProfileComplete || !role ? (
            // --- STACK FOR INCOMPLETE PROFILES (ONBOARDING) ---
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          ) : (
            // --- MAIN APP STACK FOR LOGGED-IN & COMPLETED USERS ---
            <>
              {role === 'student' ? (
                <Stack.Screen
                  name="StudentMain"
                  component={StudentTabNavigator}
                  options={{ headerShown: false }}
                />
              ) : (
                <Stack.Screen
                  name="FacultyMain"
                  component={FacultyTabNavigator}
                  options={{ headerShown: false }}
                />
              )}

              {/* Shared screens accessible after login */}
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notice Board' }} />
              <Stack.Screen name="ChatBot" component={ChatScreen} options={{ title: 'AI Assistant' }} />
              <Stack.Screen name="Reports" component={NewReportScreen} options={{ title: 'Export Data' }} />
              <Stack.Screen name="AcademicHub" component={AcademicDashboard} options={{ title: 'Resources' }} />
              <Stack.Screen name="Entertainment" component={EntertainmentScreen} options={{ title: 'Entertainment Hub' }} />
              {/* Add the detailed attendance screen here */}
             
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}