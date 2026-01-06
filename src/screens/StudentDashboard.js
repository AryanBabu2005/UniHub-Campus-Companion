import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Text, Card, Avatar, useTheme } from 'react-native-paper';
import { auth, db } from '../../firebaseconfig';
import { collection, query, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

// --- REFINED "LOGIN THEME" COLOR PALETTE ---
const COLORS = {
  primary: '#2A4D69',       // Deep Professional Blue
  primaryDark: '#1B3A4F',   // Darker shade
  secondary: '#4B86B4',     // Muted Blue
  tertiary: '#63C7B2',      // Teal/Mint
  quaternary: '#8E44AD',    // Deep Purple

  background: '#F7F9FC',    // Very light grey/blue white background
  surface: '#FFFFFF',       // Pure white surface
  textPrimary: '#2C3E50',   // Dark blue-grey text
  textSecondary: '#7F8C8D', // Muted grey text

  success: '#27AE60',       // Professional Green
  warning: '#F39C12',       // Professional Orange
  error: '#C0392B',         // Professional Red
  border: '#E0E0E0',
};

export default function StudentDashboard({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHours: 0,
    attendedHours: 0,
    percentage: 0,
    subjectWise: []
  });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const currentUserUid = auth.currentUser?.uid;
      if (!currentUserUid) return;

      const q = query(collection(db, "attendance_sessions"));
      const querySnapshot = await getDocs(q);

      let globalTotal = 0;
      let globalEarned = 0;
      const subjectMap = {};

      querySnapshot.forEach((doc) => {
        const session = doc.data();
        const subjectCode = session.subjectCode || "Unknown";
        const subjectName = session.subject || "Subject";

        const studentRecord = session.attendanceRecord?.find(
          s => s.studentId === currentUserUid || s.id === currentUserUid
        );

        if (studentRecord) {
          const maxHrs = session.duration || 1;
          let earnedHrs = 0;
          if (studentRecord.attendedHours !== undefined) {
              earnedHrs = studentRecord.attendedHours;
          } else {
              if (studentRecord.status === 'Present' || studentRecord.present === true) {
                  earnedHrs = maxHrs;
              }
          }

          globalTotal += maxHrs;
          globalEarned += earnedHrs;

          if (!subjectMap[subjectCode]) {
              subjectMap[subjectCode] = { name: subjectName, total: 0, earned: 0 };
          }
          subjectMap[subjectCode].total += maxHrs;
          subjectMap[subjectCode].earned += earnedHrs;
        }
      });

      const globalPercent = globalTotal === 0 ? 0 : (globalEarned / globalTotal) * 100;

      const subjectArray = Object.keys(subjectMap).map(code => {
          const data = subjectMap[code];
          const pct = data.total === 0 ? 0 : (data.earned / data.total) * 100;
          return {
              code: code,
              name: data.name,
              total: data.total,
              earned: data.earned,
              percentage: pct.toFixed(1)
          };
      });

      setStats({
        totalHours: globalTotal,
        attendedHours: globalEarned,
        percentage: globalPercent.toFixed(1),
        subjectWise: subjectArray
      });

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
    }, [])
  );

  const getColor = (pct) => {
      if (pct >= 75) return COLORS.success;
      if (pct >= 60) return COLORS.warning;
      return COLORS.error;
  };

  const getUserFirstName = () => {
    const displayName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student';
    return displayName.split(' ')[0];
  };

  const pieData = [
    { name: 'Attended', population: stats.attendedHours, color: COLORS.success, legendFontColor: COLORS.textSecondary, legendFontSize: 14 },
    { name: 'Missed', population: stats.totalHours - stats.attendedHours, color: COLORS.error, legendFontColor: COLORS.textSecondary, legendFontSize: 14 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      
      {/* --- HEADER: Updated Colors and subtly rounded corners --- */}
      <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.headerGradient}
          start={{x: 0, y: 0}} end={{x: 0, y: 1}} // Vertical gradient for professional look
      >
          <View style={styles.headerContent}>
            <View>
                <Text variant="headlineMedium" style={styles.greeting}>Hi, {getUserFirstName()}! 👋</Text>
                <Text variant="bodyLarge" style={styles.subGreeting}>Let's make today productive.</Text>
            </View>
            {/* --- MODIFIED SECTION: Notification Button --- */}
            <TouchableOpacity 
                onPress={() => navigation.navigate('Notifications')} 
                activeOpacity={0.8} 
                style={styles.notificationButton}
            >
                <MaterialCommunityIcons name="bell-ring-outline" size={28} color="white" />
            </TouchableOpacity>
            {/* --- END MODIFIED SECTION --- */}
          </View>
      </LinearGradient>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAttendance} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        
        {/* --- QUICK ACTIONS: New Professional Gradients & slightly larger sizes --- */}
        <Text variant="titleLarge" style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.gridContainer}>
          {/* CARD 1: ACADEMIC HUB (Deep Blue to Muted Blue) */}
          <NavCard
              title="Academic Hub"
              subtitle="Notes & Resources"
              icon="book-education-outline"
              colors={[COLORS.primary, COLORS.secondary]} 
              onPress={() => navigation.navigate('AcademicHub')}
              big
          />
           {/* CARD 2: ATTENDANCE (Distinct Professional Blue Blend) */}
          <NavCard
              title="Attendance"
              subtitle={`${stats.percentage}% Overall`}
              icon="calendar-check-outline"
              colors={['#3498DB', '#2980B9']} 
              onPress={() => navigation.navigate('AttendanceDetailScreen')} 
              big
              rightIcon="chevron-right"
          />
        </View>

        <View style={styles.gridContainerRow}>
           {/* CARD 3: CHILL ZONE (Teal/Mint accent) */}
          <NavCard
              title="Chill Zone"
              subtitle="Games & Relax"
              icon="gamepad-variant-outline"
              colors={[COLORS.tertiary, '#4DAF9C']}
              onPress={() => navigation.navigate('Entertainment')}
          />
           {/* CARD 4: AI ASSISTANT (Deep Purple accent) */}
          <NavCard
              title="AI Assistant"
              subtitle="Chat with UniBot"
              icon="robot-outline"
              colors={[COLORS.quaternary, '#6C3483']}
              onPress={() => navigation.navigate('ChatBot')}
          />
        </View>

        {/* --- CHART SECTION: Tweaked container shape --- */}
        <Text variant="titleLarge" style={styles.sectionTitle}>Attendance Overview</Text>
        <Card style={styles.chartCard}>
          <Card.Content style={{alignItems: 'center'}}>
            <PieChart
              data={pieData}
              width={screenWidth - 48} 
              height={220}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
            <View style={styles.chartSummary}>
              <Text variant="displaySmall" style={{fontWeight: '800', color: getColor(stats.percentage)}}>{stats.percentage}%</Text>
              <Text variant="bodyMedium" style={{color: COLORS.textSecondary}}>Total Attendance</Text>
            </View>
          </Card.Content>
        </Card>

        {/* --- SUBJECT LIST: Increased padding and softer corners --- */}
        {stats.subjectWise.length > 0 && (
          <>
            <Text variant="titleLarge" style={styles.sectionTitle}>Subject Performance</Text>
            {stats.subjectWise.map((sub, index) => (
              <TouchableOpacity key={index} activeOpacity={0.7} onPress={() => { /* Future expansion logic */ }}>
                <Card style={styles.subjectCardNew}>
                  <Card.Content style={styles.subjectContentNew}>
                    <View style={[styles.subjectIconBox, {backgroundColor: getColor(sub.percentage) + '15'}]}>
                      <MaterialCommunityIcons name="book-open-page-variant" size={24} color={getColor(sub.percentage)} />
                    </View>
                    <View style={styles.subjectLeftNew}>
                      <Text variant="titleMedium" style={styles.subjectCode}>{sub.code}</Text>
                      <Text variant="bodySmall" style={styles.subjectName} numberOfLines={1}>{sub.name}</Text>
                    </View>
                    <View style={styles.subjectRightNew}>
                      <Text variant="headlineSmall" style={[styles.subjectPercent, {color: getColor(sub.percentage)}]}>
                        {sub.percentage}%
                      </Text>
                      <Text variant="labelSmall" style={styles.subjectHours}>{sub.earned}/{sub.total} hrs</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.border} style={{marginLeft: 10}}/>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

// --- NAV CARD COMPONENT ---
const NavCard = ({ title, subtitle, icon, colors, onPress, big, rightIcon }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.navCardContainer, big && styles.navCardBig]}>
    <LinearGradient colors={colors} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.navCardGradient}>
        
        {/* Subtle Glass Effect Layer */}
        <View style={styles.glassLayer} />

        <View style={styles.navCardContent}>
            <View style={styles.navCardIconBox}>
                <MaterialCommunityIcons name={icon} size={32} color="white" />
            </View>
            <View style={{flex: 1}}>
                <Text variant="titleMedium" style={styles.navCardTitle}>{title}</Text>
                <Text variant="bodySmall" style={styles.navCardSubtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            {rightIcon && <MaterialCommunityIcons name={rightIcon} size={28} color="rgba(255,255,255,0.8)" />}
        </View>
        
        {/* Deco Circles - made subtler */}
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
    </LinearGradient>
  </TouchableOpacity>
);


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingBottom: 40,
    paddingHorizontal: 26,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: COLORS.primaryDark, shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'white', fontWeight: '800', fontSize: 26 },
  subGreeting: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 15 },
  
  // --- MODIFIED STYLE: Notification Button Container ---
  notificationButton: { 
    width: 52, height: 52, borderRadius: 26, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: 'black', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 
  },
  
  // Scroll Content
  scrollContent: { padding: 24, marginTop: -35 },
  sectionTitle: { fontWeight: '800', color: COLORS.textPrimary, marginBottom: 18, marginLeft: 8, marginTop: 28, fontSize: 20 },
  
  // Grids
  gridContainer: { gap: 18, marginBottom: 18 }, 
  gridContainerRow: { flexDirection: 'row', gap: 18, marginBottom: 10 },
  
  // Nav Cards
  navCardContainer: { flex: 1, borderRadius: 28, 
    overflow: 'hidden', 
    shadowColor: COLORS.primaryDark, shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  navCardBig: { height: 135 }, 
  navCardGradient: { flex: 1, padding: 22, justifyContent: 'center', position: 'relative' },
  glassLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  navCardContent: { flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  navCardIconBox: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  navCardTitle: { color: 'white', fontWeight: '800', fontSize: 19, letterSpacing: 0.3 },
  navCardSubtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 5, fontWeight: '600', fontSize: 13 },
  decoCircle1: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 1 },
  decoCircle2: { position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 1 },

  // Chart Card
  chartCard: { borderRadius: 28, backgroundColor: COLORS.surface, elevation: 4, shadowColor: COLORS.textSecondary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.08, shadowRadius: 10, paddingVertical: 15 },
  chartSummary: { position: 'absolute', top: '50%', left: '50%', transform: [{translateX: -50}, {translateY: -40}], alignItems: 'center' },

  // Subject List
  subjectCardNew: { marginBottom: 14, borderRadius: 24, backgroundColor: COLORS.surface, 
    elevation: 2, shadowColor: COLORS.textSecondary, shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.06, shadowRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  subjectContentNew: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18 }, 
  subjectIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  subjectLeftNew: { flex: 1 },
  subjectCode: { fontWeight: '800', color: COLORS.textPrimary, fontSize: 17 },
  subjectName: { color: COLORS.textSecondary, marginTop: 3, fontSize: 13, fontWeight: '500' },
  subjectRightNew: { alignItems: 'flex-end' },
  subjectPercent: { fontWeight: '900', fontSize: 22 },
  subjectHours: { color: COLORS.textSecondary, marginTop: 5, fontWeight: '600', fontSize: 12 },
});