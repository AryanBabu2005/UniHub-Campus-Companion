import React, { useState } from 'react'; // Import useState
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Surface, IconButton, useTheme, Button } from 'react-native-paper'; // Import Button
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DiscussionForumScreen({ navigation }) {
  const theme = useTheme();

  // 1. Add 'hypes' to state
  const [categories, setCategories] = useState([
    { id: 'internships', title: 'Internships & Jobs', icon: 'briefcase-search', color: '#0ea5e9', description: 'Career advice & opportunities.', hypes: 4 },
    { id: 'achievements', title: 'Hall of Fame', icon: 'trophy-award', color: '#eab308', description: 'Celebrate student wins.', hypes: 12 },
    { id: 'general', title: 'The Lounge', icon: 'coffee-outline', color: '#8b5cf6', description: 'Chill chat & hobbies.', hypes: 20 },
    { id: 'events', title: 'Events & Fests', icon: 'calendar-star', color: '#ec4899', description: 'What’s happening on campus?', hypes: 7 },
    { id: 'reviews', title: 'Campus Reviews', icon: 'star-circle-outline', color: '#f97316', description: 'Courses, food & facilities.', hypes: 8 },
    { id: 'tech', title: 'Tech Talk', icon: 'laptop-code', color: '#10b981', description: 'Coding, gadgets & AI.', hypes: 3 },
  ]);

  // 2. Create handleHype function
  const handleHype = (categoryId) => {
    setCategories(currentCategories =>
      currentCategories.map(cat =>
        cat.id === categoryId ? { ...cat, hypes: cat.hypes + 1 } : cat
      )
    );
    // In a real application, you would also send an update to Firebase here.
    // const catRef = doc(db, "forum_categories", categoryId);
    // updateDoc(catRef, { hypes: increment(1) });
  };

  return (
    <View style={styles.container}>
      
      {/* 1. HERO HEADER */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Community Hub</Text>
              <Text style={styles.headerSubtitle}>Join the conversation</Text>
            </View>
            <IconButton icon="bell-ring-outline" iconColor="white" size={26} onPress={() => {}} />
          </View>

          {/* Search Bar Visual */}
          <Surface style={styles.searchBar} elevation={4}>
            <MaterialCommunityIcons name="magnify" size={24} color="#6B7280" />
            <Text style={styles.searchText}>Search topics, tags...</Text>
          </Surface>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. CATEGORIES GRID */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Communities</Text>
        </View>

        <View style={styles.grid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.cardWrapper}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('CategoryPosts', { categoryId: cat.id, categoryTitle: cat.title })}
            >
              <Surface style={styles.card} elevation={2}>
                <View>
                    <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${cat.color}15` }]}>
                        <MaterialCommunityIcons name={cat.icon} size={28} color={cat.color} />
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${cat.color}15` }]}>
                        <Text style={[styles.badgeText, { color: cat.color }]}>{cat.posts}</Text>
                    </View>
                    </View>
                    
                    <Text style={styles.cardTitle}>{cat.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{cat.description}</Text>
                </View>
                
                {/* 3. Update Card Footer with Hype Button */}
                <View style={styles.cardFooter}>
                    <View style={styles.enterForum}>
                        <Text style={styles.joinText}>Enter Forum</Text>
                        <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
                    </View>
                    <Button 
                        icon="fire" 
                        mode="text" 
                        textColor={cat.color}
                        labelStyle={{fontSize: 12}}
                        onPress={() => handleHype(cat.id)}
                        contentStyle={{flexDirection: 'row-reverse', padding: 0, height: 30}}
                        style={{marginRight: -10}}
                    >
                        {cat.hypes}
                    </Button>
                </View>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  
  // Header Styles
  headerContainer: {
    height: 180,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 8,
  },
  headerGradient: { flex: 1, padding: 20, paddingTop: 50, position: 'relative' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  // Search Bar (Visual only)
  searchBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchText: { color: '#9CA3AF', marginLeft: 10, fontSize: 14 },

  scrollContent: { paddingHorizontal: 20 },

  // Section Headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardWrapper: { width: (width - 55) / 2, marginBottom: 16 }, // responsive 2 column
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    height: 180, // Increased height slightly
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  iconContainer: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, // Changed to space-between
  enterForum: { flexDirection: 'row', alignItems: 'center' }, // Wrap "Enter Forum" part
  joinText: { fontSize: 12, fontWeight: '600', color: '#4c669f', marginRight: 4 },
});