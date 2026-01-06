import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Dimensions, 
  Animated, 
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, TextInput as PaperInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebaseconfig';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2A4D69', 
  secondary: '#4B86B4',
  background: '#F7F9FC',
  cardBg: '#FFFFFF',
  text: '#2C3E50',
  subtext: '#7F8C8D',
  border: '#E0E0E0',
  success: '#10B981',
};

export default function OnboardingScreen({ navigation }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Data
    const [collegeList, setCollegeList] = useState([]); 
    const [deptList, setDeptList] = useState([]); 
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Selection State
    const [fullName, setFullName] = useState('');
    const [college, setCollege] = useState(null);
    const [department, setDepartment] = useState(null);
    const [role, setRole] = useState('student'); 
    const [semester, setSemester] = useState(null);

    // Animation
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const fetchColleges = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "meta_colleges"));
                const colleges = [];
                querySnapshot.forEach((doc) => colleges.push({ id: doc.id, ...doc.data() }));
                setCollegeList(colleges);
            } catch (error) {
                console.error(error);
                Alert.alert("Error", "Could not fetch colleges. Please check your internet connection.");
            } finally {
                setInitialLoading(false);
            }
        };
        fetchColleges();
    }, []);

    const changeStep = (newStep) => {
        Keyboard.dismiss();
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: newStep > step ? 50 : -50, duration: 0, useNativeDriver: true }),
        ]).start(() => {
            setStep(newStep);
            setSearchQuery(''); 
            slideAnim.setValue(newStep > step ? 50 : -50);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        });
    };

    const handleCollegeSelect = (colData) => {
        setCollege(colData); 
        setDeptList(colData.departments || []); 
        changeStep(2);
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim()) return Alert.alert("Required", "Please enter your full name.");
        if (role === 'student' && !semester) return Alert.alert("Required", "Please select your semester.");

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication session expired. Please log in again.");

            let enrolledSubjects = [];
            if (role === 'student') {
                const q = query(
                    collection(db, "meta_subjects"), 
                    where("college", "==", college.name),
                    where("dept", "==", department),
                    where("sem", "==", semester)
                );
                const subSnap = await getDocs(q);
                subSnap.forEach(doc => enrolledSubjects.push(doc.data().code));
            }

            // 1. Save data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                name: fullName,
                college: college.name, 
                department: department,
                role: role,
                semester: role === 'student' ? semester : null,
                enrolledSubjects: enrolledSubjects, 
                createdAt: new Date(),
                isProfileComplete: true
            }, { merge: true });

            // ⭐️ THE FIX: Force a token refresh.
            // This triggers the onAuthStateChanged listener in App.js to re-run,
            // which will re-fetch the user's Firestore doc and see isProfileComplete: true.
            await user.getIdToken(true);

        } catch (error) {
            console.error("Profile Save Error:", error);
            Alert.alert("Error", "Failed to save profile. Please try again.");
            setLoading(false); // Only stop loading on error
        }
        // Note: We do NOT set loading(false) on success. 
        // We let the screen unmount automatically when App.js switches stacks.
    };

    const getFilteredColleges = () => collegeList.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const getFilteredDepts = () => deptList.filter(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{marginTop: 20, color: COLORS.subtext}}>Loading institutes...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            
            {/* --- TOP NAVIGATION BAR --- */}
            <View style={styles.navBar}>
                {step > 1 ? (
                    <TouchableOpacity onPress={() => changeStep(step - 1)} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                ) : (
                    <View style={{width: 40}} /> 
                )}
                
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${(step / 3) * 100}%` }]} />
                </View>
                
                <View style={{width: 40}} /> 
            </View>

            {/* --- MAIN CONTENT AREA --- */}
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                
                {/* HEADERS */}
                <View style={styles.headerContainer}>
                    <Text style={styles.stepLabel}>STEP {step} OF 3</Text>
                    <Text style={styles.headerTitle}>
                        {step === 1 && "Select Institute"}
                        {step === 2 && "Choose Department"}
                        {step === 3 && "Finalize Profile"}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {step === 1 && "Which college are you attending?"}
                        {step === 2 && `Departments at ${college?.name}`}
                        {step === 3 && "Tell us a bit about yourself"}
                    </Text>
                </View>

                {/* STEP 1: COLLEGES */}
                {step === 1 && (
                    <>
                        <View style={styles.searchContainer}>
                            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.subtext} style={{marginRight: 10}} />
                            <PaperInput 
                                placeholder="Search colleges..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                underlineColor="transparent"
                                activeUnderlineColor="transparent"
                                style={styles.searchInput}
                                theme={{ colors: { background: 'transparent' }}}
                            />
                        </View>
                        <FlatList
                            data={getFilteredColleges()}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    onPress={() => handleCollegeSelect(item)} 
                                    activeOpacity={0.7}
                                    style={styles.card}
                                >
                                    <View style={styles.cardIconBox}>
                                        <MaterialCommunityIcons name="bank-outline" size={24} color={COLORS.primary} />
                                    </View>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.cardTitle}>{item.name}</Text>
                                        <Text style={styles.cardSub}>{item.location || "Main Campus"}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#BDC3C7" />
                                </TouchableOpacity>
                            )}
                        />
                    </>
                )}

                {/* STEP 2: DEPARTMENTS */}
                {step === 2 && (
                    <>
                            <View style={styles.searchContainer}>
                            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.subtext} style={{marginRight: 10}} />
                            <PaperInput 
                                placeholder="Search departments..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                underlineColor="transparent"
                                activeUnderlineColor="transparent"
                                style={styles.searchInput}
                                theme={{ colors: { background: 'transparent' }}}
                            />
                        </View>
                        <FlatList
                            data={getFilteredDepts()}
                            keyExtractor={item => item}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    onPress={() => { setDepartment(item); changeStep(3); }} 
                                    activeOpacity={0.7}
                                    style={styles.card}
                                >
                                    <View style={[styles.cardIconBox, { backgroundColor: '#E8F6F3' }]}>
                                        <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color="#16A085" />
                                    </View>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.cardTitle}>{item}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#BDC3C7" />
                                </TouchableOpacity>
                            )}
                        />
                    </>
                )}

                {/* STEP 3: PROFILE FORM */}
                {step === 3 && (
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            
                            <Text style={styles.inputLabel}>FULL NAME</Text>
                            <PaperInput 
                                value={fullName}
                                onChangeText={setFullName}
                                mode="outlined"
                                outlineColor={COLORS.border}
                                activeOutlineColor={COLORS.primary}
                                style={styles.input}
                                placeholder="e.g. John Doe"
                                theme={{ roundness: 12 }}
                            />

                            <Text style={styles.inputLabel}>I AM A</Text>
                            <View style={styles.roleContainer}>
                                <TouchableOpacity 
                                    style={[styles.roleBox, role === 'student' && styles.roleBoxActive]} 
                                    onPress={() => setRole('student')}
                                >
                                    <MaterialCommunityIcons name="school-outline" size={24} color={role === 'student' ? COLORS.primary : COLORS.subtext} />
                                    <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
                                    {role === 'student' && <View style={styles.checkCircle}><MaterialCommunityIcons name="check" size={12} color="#fff"/></View>}
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.roleBox, role === 'faculty' && styles.roleBoxActive]} 
                                    onPress={() => setRole('faculty')}
                                >
                                    <MaterialCommunityIcons name="account-tie-outline" size={24} color={role === 'faculty' ? COLORS.primary : COLORS.subtext} />
                                    <Text style={[styles.roleText, role === 'faculty' && styles.roleTextActive]}>Faculty</Text>
                                    {role === 'faculty' && <View style={styles.checkCircle}><MaterialCommunityIcons name="check" size={12} color="#fff"/></View>}
                                </TouchableOpacity>
                            </View>

                            {role === 'student' && (
                                <>
                                    <Text style={styles.inputLabel}>CURRENT SEMESTER</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 30}}>
                                        {[1,2,3,4,5,6,7,8].map(s => (
                                            <TouchableOpacity 
                                                key={s} 
                                                onPress={() => setSemester(s)}
                                                style={[styles.semCircle, semester === s && styles.semCircleActive]}
                                            >
                                                <Text style={[styles.semText, semester === s && styles.semTextActive]}>{s}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            <TouchableOpacity onPress={handleSaveProfile} disabled={loading} activeOpacity={0.8}>
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.secondary]}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 0}}
                                    style={styles.submitBtn}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Complete Setup</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                        </ScrollView>
                    </KeyboardAvoidingView>
                )}

            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    // Navigation
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    progressBarContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E8E8',
        borderRadius: 3,
        marginHorizontal: 20,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    // Content
    content: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
        marginTop: 10,
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: 8,
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: COLORS.subtext,
    },
    // Lists & Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        borderRadius: 12,
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        height: 50,
        backgroundColor: 'transparent',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cardIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F4F6F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    cardSub: {
        fontSize: 13,
        color: COLORS.subtext,
    },
    // Form Styles
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.subtext,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        fontSize: 16,
        marginBottom: 8,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 10,
    },
    roleBox: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    roleBoxActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#F0F8FF',
    },
    roleText: {
        marginTop: 8,
        fontWeight: '600',
        color: COLORS.subtext,
    },
    roleTextActive: {
        color: COLORS.primary,
    },
    checkCircle: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Semester Circles
    semCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    semCircleActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    semText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.subtext,
    },
    semTextActive: {
        color: '#fff',
    },
    // Submit Button
    submitBtn: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});