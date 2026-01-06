import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar, 
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../firebaseconfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

// Professional Color Palette
const COLORS = {
  primary: '#2A4D69', // Deep Blue
  accent: '#4B86B4',  // Muted Blue
  background: '#F7F9FC', // Very light grey/blue white
  text: '#2C3E50',
  error: '#E74C3C',
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  
  // Security: Admin button is hidden by default
  const [showAdminEntry, setShowAdminEntry] = useState(false);

  const handleAuth = async (type) => {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      Alert.alert("Missing Information", "Please provide your credentials.");
      return;
    }

    setLoading(true);
    try {
      // --- AUTHENTICATION ---
      // The moment this succeeds, onAuthStateChanged in App.js fires.
      if (type === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      
      // --- NO MANUAL NAVIGATION HERE ---
      // App.js will detect the user is logged in and switch screens automatically.
      // We just let it happen. The loading spinner will disappear when the screen changes.

    } catch (error) {
      let errorMessage = error.message;
      if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
      if (error.code === 'auth/user-not-found') errorMessage = "User not found.";
      if (error.code === 'auth/wrong-password') errorMessage = "Incorrect password.";
      if (error.code === 'auth/email-already-in-use') errorMessage = "Email already registered.";
      
      Alert.alert("Access Denied", errorMessage);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
        Alert.alert("Email Required", "Enter your email to receive a reset link.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email.trim());
        Alert.alert("Check your Email", "Password reset instructions have been sent.");
    } catch (error) {
        Alert.alert("Error", error.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header Section */}
        <View style={styles.headerArea}>
            <LinearGradient
                colors={[COLORS.primary, '#1e3c55']}
                style={styles.headerGradient}
            >
                {/* Decorative Circles */}
                <View style={styles.circle1} />
                <View style={styles.circle2} />

                <View style={styles.brandContainer}>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onLongPress={() => {
                            Alert.alert("Developer Mode", "Admin access enabled.");
                            setShowAdminEntry(true);
                        }}
                        delayLongPress={3000} // Hold for 3 seconds to reveal admin
                    >
                        <View style={styles.logoCircle}>
                            <MaterialCommunityIcons name="school" size={40} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.appTitle}>UniHub</Text>
                    <Text style={styles.appTagline}>Your Campus, Connected.</Text>
                </View>
            </LinearGradient>
        </View>

        {/* Login Form Sheet */}
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheetContainer}
        >
            <View style={styles.sheet}>
                <View style={styles.handleBar} />
                
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.instructionText}>Sign in to access your dashboard</Text>

                <View style={styles.formArea}>
                    <TextInput
                        label="Student/Faculty Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={COLORS.primary}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        left={<TextInput.Icon icon="email" color={COLORS.accent} />}
                        theme={{ roundness: 12 }}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={COLORS.primary}
                        style={styles.input}
                        secureTextEntry={secureTextEntry}
                        left={<TextInput.Icon icon="lock" color={COLORS.accent} />}
                        right={
                            <TextInput.Icon 
                                icon={secureTextEntry ? "eye-off" : "eye"} 
                                onPress={() => setSecureTextEntry(!secureTextEntry)} 
                                color="#999"
                            />
                        }
                        theme={{ roundness: 12 }}
                    />

                    <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotAlign}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => handleAuth('login')}
                        disabled={loading}
                        style={styles.primaryButtonWrapper}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={styles.primaryButton}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Sign In</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>New here? </Text>
                        <TouchableOpacity onPress={() => handleAuth('signup')}>
                            <Text style={styles.signupText}>Create Account</Text>
                        </TouchableOpacity>
                    </View>

                    {/* HIDDEN ADMIN ACCESS */}
                    {showAdminEntry && (
                        <TouchableOpacity 
                            style={styles.adminLink}
                            // Ensure AdminPanel is registered in App.js if you use this
                            onPress={() => navigation.navigate('AdminPanel')}
                        >
                            <View style={styles.adminBadge}>
                                <MaterialCommunityIcons name="shield-account" size={16} color="#c0392b" />
                                <Text style={styles.adminText}>Administrator Portal</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  headerArea: {
    height: height * 0.35, // Top 35% of screen
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Subtle background aesthetics
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -50,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -80,
    left: -80,
  },
  brandContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // The "Sheet" Logic
  sheetContainer: {
    flex: 1,
    zIndex: 20,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: '#7F8C8D',
    marginBottom: 32,
  },
  formArea: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
    fontSize: 15,
  },
  forgotAlign: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  forgotText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  primaryButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  primaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#7F8C8D',
    fontSize: 14,
  },
  signupText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Admin Styles (Subtle)
  adminLink: {
    marginTop: 30,
    alignSelf: 'center',
    opacity: 0.8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadbd8', // very light red
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  adminText: {
    color: '#c0392b',
    fontSize: 12,
    fontWeight: '700',
  }
});