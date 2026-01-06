import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { db } from '../../firebaseconfig';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

const REAL_WORLD_DATA = {
  "Cluster Innovation Centre": {
    departments: ["IT&MI", "BA(Honours)", "MME"],
    subjects: [
      //IT & MI Subjects
      { name: "ODE", code: "DSC07", dept: "IT&MI", sem: 3 },
      { name: "Operating System", code: "DSC08", dept: "IT&MI", sem: 3 },
      { name: "CSA", code: "DSC09", dept: "IT&MI", sem: 3 },
      { name: "Calculus", code: "DSC02", dept: "IT&MI", sem: 1 },
      { name: "Programming Fundamental", code: "DSC01", dept: "IT&MI", sem: 1 },
      // BA(Honours) Subjects
      { name: "Humanities", code: "DSC001", dept: "BA(Honours)", sem: 1 },
      { name: "Tech and Society", code: "DSC002", dept: "BA(Honours)", sem: 1 }
    ]
  },
  "Hindu College": {
    departments: ["BA(Pol Sci)", "BA(History)"],
    subjects: [
      { name: "History of India", code: "CC01", dept: "BA(History)", sem: 1 },
      { name: "Constitution Democracy", code: "CC001", dept: "BA(Pol Sci)", sem: 1 }
    ]
  }
};

export default function AdminSetupScreen() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready to Initialize Database");

  const runSetup = async () => {
    setLoading(true);
    setStatus("Starting upload...");
    
    try {
      const batch = writeBatch(db);

      // Loop through each college
      for (const [collegeName, data] of Object.entries(REAL_WORLD_DATA)) {
        
        // 1. Create College Document (Meta Data)
        const collegeRef = doc(db, "meta_colleges", collegeName);
        batch.set(collegeRef, {
          name: collegeName,
          departments: data.departments
        });

        // 2. Upload Subjects individually
        data.subjects.forEach(sub => {
          // Unique ID: COLLEGE_DEPT_CODE (e.g., DTU_CS_CS101)
          const subId = `${collegeName}_${sub.dept}_${sub.code}`.replace(/\s+/g, '');
          const subRef = doc(db, "meta_subjects", subId);
          batch.set(subRef, {
            ...sub,
            college: collegeName
          });
        });
      }

      await batch.commit();
      setStatus("Success! Database is now Real World ready.");
      Alert.alert("Success", "Real world data uploaded to Firebase!");

    } catch (error) {
      console.error(error);
      setStatus("Error: " + error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text variant="headlineSmall" style={{marginBottom: 20, textAlign:'center'}}>Admin DB Tool 🛠️</Text>
      <Card style={{padding: 20}}>
        <Text style={{marginBottom: 20, textAlign:'center'}}>
            Click below to upload the College, Department, and Subject lists to Firestore.
        </Text>
        <Text style={{marginBottom: 20, fontWeight:'bold', textAlign:'center', color:'green'}}>
            {status}
        </Text>
        <Button mode="contained" onPress={runSetup} loading={loading} disabled={loading}>
          Initialize Real World Data
        </Button>
      </Card>
    </View>
  );
}
