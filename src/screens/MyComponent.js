import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Divider, useTheme } from 'react-native-paper';

export default function MyComponent() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Welcome to MyComponent</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>This is a simple component using React Native Paper.</Text>
      <Divider style={styles.divider} />
      <Button mode="contained" onPress={() => console.log('Button pressed!')}>
        Click Me
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 20,
    color: 'gray',
  },
  divider: {
    width: '100%',
    marginBottom: 20,
  },
});