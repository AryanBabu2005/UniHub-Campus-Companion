import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, Avatar, Card, useTheme, Divider, Chip, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ProfileScreen() {
    const theme = useTheme();
    const user = auth.currentUser;
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Editable Fields State
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, [user]);

    const fetchUserData = async () => {
        if (user) {
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setPhone(data.phone || '');
                    if (data.dob && data.dob.toDate) {
                        setDob(data.dob.toDate());
                    }
                }
            } catch (e) {
                console.error("Error fetching profile:", e);
                Alert.alert("Error", "Could not load profile.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'users', user.uid);
            const updateData = { phone: phone, dob: dob };
            await updateDoc(docRef, updateData);
            setUserData({ ...userData, ...updateData });
            setIsEditing(false);
            Alert.alert("Success", "Profile updated successfully!");
        } catch (e) {
            console.error("Error updating profile:", e);
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || dob;
        setShowDatePicker(Platform.OS === 'ios');
        setDob(currentDate);
    };

    // --- LOGOUT FUNCTION ---
    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out", style: "destructive", onPress: async () => {
                    try {
                        // --- SIGN OUT ONLY ---
                        // App.js detects this and switches to the Login screen automatically.
                        await auth.signOut();
                    } catch (e) {
                        Alert.alert("Error", e.message);
                    }
                }
            }
        ]);
    };

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Card style={styles.card}>
                <Card.Content style={styles.content}>
                    <View style={styles.header}>
                        <Avatar.Text 
                            size={100} 
                            label={userData?.name ? userData.name[0].toUpperCase() : "U"} 
                            style={{ backgroundColor: theme.colors.primary }} 
                            color="white"
                        />
                        <IconButton
                            icon={isEditing ? "close" : "pencil"}
                            mode="contained"
                            containerColor={theme.colors.secondaryContainer}
                            iconColor={theme.colors.onSecondaryContainer}
                            size={24}
                            style={styles.editBtn}
                            onPress={() => {
                                if (isEditing) {
                                    setPhone(userData.phone || '');
                                    if (userData.dob && userData.dob.toDate) setDob(userData.dob.toDate());
                                }
                                setIsEditing(!isEditing);
                            }}
                        />
                    </View>
                    
                    <Text variant="headlineMedium" style={styles.name}>{userData?.name}</Text>
                    <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
                    
                    {userData?.role && (
                        <Chip style={styles.chip} icon="account-circle-outline" mode="outlined">
                            {userData.role.toUpperCase()}
                        </Chip>
                    )}

                    <Divider style={styles.divider} />

                    <View style={styles.detailsContainer}>
                       <InfoRow icon="🏛️" text={userData?.college} />
                       <InfoRow icon="📚" text={userData?.department} />
                       {userData?.role === 'student' && userData?.semester && (
                           <InfoRow icon="📅" text={`Semester ${userData.semester}`} />
                       )}
                       {userData?.role === 'student' && userData?.rollNo && (
                           <InfoRow icon="card-account-details-outline" text={`Roll No: ${userData.rollNo}`} isMaterialIcon />
                       )}
                       
                       <Divider style={styles.divider} />
                       
                       <Text variant="titleMedium" style={{marginBottom: 15, fontWeight:'bold'}}>Personal Details</Text>
                       
                       <EditableField 
                           label="Phone Number" 
                           value={phone} 
                           onChangeText={setPhone} 
                           isEditing={isEditing} 
                           keyboardType="phone-pad"
                           icon="phone"
                       />

                       <View style={styles.inputContainer}>
                           <TextInput
                               label="Date of Birth"
                               value={dob.toLocaleDateString()}
                               mode="outlined"
                               editable={false}
                               right={<TextInput.Icon icon="calendar" disabled={!isEditing} onPress={() => isEditing && setShowDatePicker(true)} />}
                               style={styles.input}
                               disabled={!isEditing}
                           />
                           {showDatePicker && (
                               <DateTimePicker
                                   testID="dateTimePicker"
                                   value={dob}
                                   mode="date"
                                   display="default"
                                   onChange={onDateChange}
                                   maximumDate={new Date()}
                               />
                           )}
                       </View>

                    </View>

                    {isEditing ? (
                        <Button 
                            mode="contained" 
                            onPress={handleSaveProfile} 
                            loading={saving} 
                            disabled={saving}
                            style={styles.actionBtn}
                            contentStyle={{paddingVertical: 5}}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    ) : (
                        <Button 
                            mode="outlined" 
                            onPress={handleLogout} 
                            textColor={theme.colors.error} 
                            style={[styles.actionBtn, {borderColor: theme.colors.error}]}
                            contentStyle={{paddingVertical: 5}}
                        >
                            Log Out
                        </Button>
                    )}
                </Card.Content>
            </Card>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}

const InfoRow = ({ icon, text, isMaterialIcon }) => (
    <View style={styles.detailRow}>
        {isMaterialIcon ? <IconButton icon={icon} size={24} style={{margin:0}}/> : <Text style={{fontSize:22, marginLeft: 10}}>{icon}</Text>}
        <Text variant="bodyLarge" style={styles.detailText}>{text}</Text>
    </View>
);

const EditableField = ({ label, value, onChangeText, isEditing, keyboardType='default', icon }) => (
    <View style={styles.inputContainer}>
        <TextInput
            label={label}
            value={value}
            onChangeText={onChangeText}
            mode="outlined"
            editable={isEditing}
            keyboardType={keyboardType}
            disabled={!isEditing}
            style={styles.input}
            right={<TextInput.Icon icon={icon} disabled={!isEditing} />}
        />
    </View>
);

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20 },
    centered: { flex: 1, justifyContent:'center', alignItems:'center' },
    card: { borderRadius: 20, elevation: 4, backgroundColor: 'white', marginBottom: 20 },
    content: { alignItems: 'center', paddingVertical: 30 },
    header: { position: 'relative', marginBottom: 15 },
    editBtn: { position: 'absolute', right: -10, bottom: 0 },
    name: { fontWeight: 'bold', marginTop: 10 },
    email: { color: 'gray', marginBottom: 15 },
    chip: { marginBottom: 20 },
    divider: { width: '100%', marginVertical: 15 },
    detailsContainer: { width: '100%', paddingHorizontal: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    detailText: { marginLeft: 15, fontWeight: '500' },
    actionBtn: { marginTop: 30, borderRadius: 12, width: '100%' },
    inputContainer: { marginBottom: 15, width: '100%' },
    input: { backgroundColor: 'white' }
});