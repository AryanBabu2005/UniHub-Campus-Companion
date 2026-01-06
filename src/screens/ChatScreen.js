import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, Keyboard, Animated, Dimensions } from 'react-native';
import { TextInput, Text, Card, Avatar, ActivityIndicator, useTheme, IconButton } from 'react-native-paper';

// ==========================================
// --- THE ULTIMATE LOCAL CAMPUS BOT "BRAIN" ---
// ==========================================

// Helper function to pick a random response from an array for variety
const pickRandom = (array) => array[Math.floor(Math.random() * array.length)];

// Define the extensive list of rules (20+ scenarios)
const BOT_RULES = [
  // ==============================
  // 1. THE "PERFECT INTRO" & APP INFO
  // ==============================
  {
    triggers: ["what is this app", "what is unihub", "tell me about the project", "intro", "who are you", "what do you do"],
    responses: [
      "Welcome to **UniHub**! 🎓✨ Think of it as your ultimate digital campus companion. We connect students and faculty seamlessly! You can track your attendance 📅, access study materials in the Academic Hub 📚, grab important notices 📢, and even chill out in the Entertainment zone 🎮. It's everything you need for campus life, right in your pocket! 🚀",
      "I'm UniBot, and this is **UniHub**! 🌟 We're here to simplify your student life. From checking attendance 📝 and connecting with teachers 👨‍🏫 to finding notes 📖 and taking fun breaks 🍿. We've got your entire campus experience covered!",
      "I'm your AI campus buddy living inside UniHub! 🤖 This project is all about bridging the gap between you and your campus resources. Check attendance, find notes, or just relax—all in one app. ✨"
    ]
  },

  // ==============================
  // 2. LOCAL FLAVOR & INSIDE JOKES (NEW!)
  // ==============================
  {
    triggers: ["where to eat", "hungry", "nearby food", "good food", "lunch"],
    responses: [
      "Oh, that's an easy one! 😋 You have to go to **Panditji Canteen**! They have the best stuff. Go eat anything you want there, you won't regret it! 🍔🍕",
      "Feeling peckish? Head straight to **Panditji Canteen**. It's the legendary campus spot for a reason. Trust me on this one! 🥐✨"
    ]
  },
  {
    triggers: ["amrit", "who is amrit", "tell me about amrit"],
    responses: [
      "Amrit? Oh boy. Let's just say if procrastination was an Olympic sport, Amrit would have a gold medal. 😂 Just kidding! (Maybe).",
      "Ask Amrit about the time he tried to cook. Actually, don't. We're still cleaning up. 🍳💥",
      "Amrit is the only person I know who can trip over a cordless phone. A true legend. 🤣"
    ]
  },
  {
    triggers: ["harsh", "who is harsh", "topper"],
    responses: [
      "Harsh? You mean THE Harsh? 🏆 He is officially recognized as the campus topper. The legend says he finishes exams before the question paper is even handed out. Beat him if you can! 😎",
      "Harsh is basically a walking encyclopedia. If you want to challenge him academically, bring your A-game (and maybe a calculator). 🤓📚",
      "Beware! Harsh is the undisputed academic champion here. Trying to outscore him is a dangerous game. Good luck! 😉✨"
    ]
  },
  {
    triggers: ["cricket", "india match", "did india win"],
    responses: [
      "Don't even ask... 😭 India lost the match. My virtual heart is broken. Let's change the topic, please. 💔🏏",
      "Ugh, the cricket match? Yeah, India lost. It's a national tragedy. I'm still in mourning. 😢🇮🇳",
      "Sadly, yes. India lost. But hey, there's always the next match, right? (Trying to stay positive here). 😅"
    ]
  },

  // ==============================
  // 3. ACADEMIC & STUDY SUPPORT
  // ==============================
  {
    triggers: ["book", "study material", "notes", "resources", "where are notes", "syllabus"],
    responses: [
      "Stressing about study materials? 📚 Don't worry, we've got you covered! Head over to the **Academic Hub** tab. You'll find resources, notes, and everything you need to crush those classes! 💪🎓",
      "Need books or notes? Say no more! 📖 The **Academic Hub** section is stocked with materials uploaded by faculty. Go check it out! ✨",
      "All your study materials and resources are neatly organized in the **Academic Hub**. Happy studying! 🤓"
    ]
  },
  {
    triggers: ["exam", "test", "midterm", "finals", "quiz", "prepare for test"],
    responses: [
      "Exams coming up? You got this! 😤 Check the Academic Hub for prep materials, and make sure you know your schedule. Good luck! 🍀",
      "Time to lock in! 🔒 Don't panic about exams. Review your notes in the Academic section and take it one step at a time. You're gonna do great. ✨"
    ]
  },
  {
    triggers: ["schedule", "timetable", "classes", "what class now", "where do i go"],
    responses: [
      "Lost track of time? ⏰ Check the **Academic Hub** for your current timetable and room numbers. Don't be late! 🏃💨",
      "Your full class schedule is always available in the Academic section of the app. 📅"
    ]
  },

  // ==============================
  // 4. ATTENDANCE (The Motivator)
  // ==============================
  {
    triggers: ["attendance", "short attendance", "low attendance", "my attendance", "check attendance"],
    responses: [
      "Take a deep breath! 🌬️ Don't panic about attendance numbers right now. First, focus on preparing for your upcoming classes and exams 📝. Just make sure to check your status regularly here in the app—we keep it brief and easy to understand. And hey, if it's looking a little short, don't give up! 🥺 You can turn it around. Show up and shine! ✨💪",
      "Hey, don't stress too much about the numbers today. 😌 The most important thing is learning 📚. Check your attendance regularly here so you know where you stand. If it's low, consider this your motivational boost: You can do this! Every class counts from today onwards! 🔥🎓"
    ]
  },

  // ==============================
  // 5. RELAXATION & ENTERTAINMENT
  // ==============================
  {
    triggers: ["relax", "bored", "chill", "fun", "entertainment", "break", "tired of studying", "play game"],
    responses: [
      "Need a break from the grind? 😌 Say no more! Tap on the **Chill Zone** (Entertainment tab). It's the perfect place to unwind, play some games, and recharge. 🎮🍿✨",
      "All work and no play? No way! 🙅‍♀️ Head over to the **Entertainment** section. We've got fun stuff there to help you de-stress. You deserve it! 🥳",
      "Feeling bored? 🥱 Jump into the **Chill Zone** tab! It's designed specifically to help you relax between classes. 🕹️🎉"
    ]
  },

  // ==============================
  // 6. CAMPUS LIFE & WELL-BEING
  // ==============================
  {
    triggers: ["stressed", "anxious", "overwhelmed", "panic", "too much work", "sad"],
    responses: [
      "Hey, it's okay to feel overwhelmed sometimes. Campus life is tough! 🫂 Take a deep breath. 🌬️ Maybe take a short walk or head to the Chill Zone for a distraction. You've got this. ✨",
      "Remember to be kind to yourself. ❤️ If things are getting too heavy, don't hesitate to reach out to campus support services or a friend. For now, maybe a quick break in the Entertainment section? 🎮"
    ]
  },
  {
    triggers: ["event", "happening", "party", "fest", "activities"],
    responses: [
      "Looking for action? 🎉 Check the **Notice Board** for official announcements or the **Entertainment** section to see campus event listings! 📢",
      "Stay updated on campus buzz by checking the Notifications screen regularly! ✨"
    ]
  },

  // ==============================
  // 7. BASIC INTERACTION & CHAT
  // ==============================
  {
    triggers: ["hi", "hello", "hey", "yo ", "sup", "greetings", "morning", "afternoon"],
    responses: [
      "Hey there! 👋✨ UniBot at your service! What's on your mind today?",
      "Hiya! 🌟 Great to see you. How can I help make your campus life a little easier right now?",
      "Hello! 🥳 I'm ready to help. What are we tackling today, buddy?",
      "Yo! What's up? 👋 Need help finding something in the app?"
    ]
  },
  {
    triggers: ["how are you", "how ya doin", "what's up with you"],
    responses: [
      "I'm feeling fantastic and ready to help! ⚡ How are YOU doing today? ✨",
      "Living the dream inside your phone! 📱 Just waiting to help you ace this semester. How are things going?",
      "I'm great! Just organizing some virtual data blocks. 🧱 What can I do for you?"
    ]
  },
  {
    triggers: ["bye", "see ya", "cya", "goodbye", "later", "leaving"],
    responses: [
      "Catch you later! 👋 Don't forget to stay hydrated and awesome. ✨",
      "Goodbye! Good luck with everything today! 🍀",
      "See ya! I'll be here whenever you need me next. 🤖💙"
    ]
  },
  {
    triggers: ["thank", "thx", "appreciate it", "thanks"],
    responses: [
      "You're so welcome! Happy to help! 🥰",
      "No problem at all! That's what campus buddies are for! 🤜🤛",
      "Anytime! ✨ Let me know if you need anything else."
    ]
  },

  // ==============================
  // 8. FUN & MISC
  // ==============================
  {
    triggers: ["joke", "tell me a joke", "make me laugh"],
    responses: [
      "Why did the student bring a ladder to school? Because they wanted to go to high school! 🥁 (Okay, bad bot joke. 😅)",
      "I'm better at finding notes than telling jokes, but here goes: Why was the math book sad? Because it had too many problems. 📘😥",
      "Why do students love coffee? Because it's grounds for success! ☕✨"
    ]
  },
  {
    triggers: ["motivate", "motivation", "inspire me"],
    responses: [
      "Believe you can and you're halfway there. ✨ You got this!",
      "Success is the sum of small efforts, repeated day in and day out. Keep going! 💪🎓",
      "Don't stop until you're proud. (And then maybe take a nap in the Chill Zone). 😉"
    ]
  }
];

// Fallback responses that include chat-starters
const DEFAULT_RESPONSES = [
  "Hmm, I'm not 100% sure about that one yet. 🤔 I'm still learning! Try asking about the 'app', 'study materials', or 'attendance'. By the way, which cricket team do you support? 🏏",
  "Ooh, you stumped me! 😅 That's outside my current training. Try asking about exams, relaxing, or just say hi! 👋 What's your favorite movie genre, by the way? 🎬",
  "Sorry, I didn't quite catch that. 🙉 I'm best with campus-related stuff like finding notes or checking schedules. Speaking of which, who is your favorite actor? 🤩",
  "My circuits are a bit confused! 🤖💥 Try asking for 'help' or ask 'what is unihub' to see what I can do. Tell me, do you prefer coffee or tea while studying? ☕🍵"
];

// The logic function to find the best match
function getLocalBotReply(userText) {
  const lowerText = userText.toLowerCase();
  
  for (const rule of BOT_RULES) {
    // Stricter matching for short words to avoid false positives (e.g., "hi" inside "this")
    const matchFound = rule.triggers.some(trigger => {
       if(trigger.length <= 3) {
           // Match whole word only
           return (` ${lowerText} `).includes(` ${trigger} `);
       }
       // Standard partial match for longer phrases
       return lowerText.includes(trigger);
    });

    if (matchFound) {
      return pickRandom(rule.responses);
    }
  }
  return pickRandom(DEFAULT_RESPONSES);
}
// ==========================================


export default function ChatScreen() {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputContainerBottom = useRef(new Animated.Value(0)).current;
  
  // Initial message (Friendly tone)
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hey there! 👋✨ I'm UniBot, your AI campus buddy. I'm here to help you navigate student life. Ask me 'what is unihub', about study materials, or tell me if you need to relax!" }
  ]);

  const scrollViewRef = useRef();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // --- KEYBOARD HANDLING FOR INPUT VISIBILITY ---
  useEffect(() => {
    const keyboardWillShow = (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      Animated.timing(inputContainerBottom, {
        toValue: event.endCoordinates.height,
        duration: event.duration,
        useNativeDriver: false,
      }).start();
    };

    const keyboardWillHide = (event) => {
      setKeyboardHeight(0);
      Animated.timing(inputContainerBottom, {
        toValue: 0,
        duration: event.duration,
        useNativeDriver: false,
      }).start();
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [inputContainerBottom]);


  const handleSend = () => {
    const userText = input.trim();
    if (!userText) return;

    // Don't dismiss keyboard to keep chatting flow smooth
    // Keyboard.dismiss(); 
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    const botResponseText = getLocalBotReply(userText);

    // Simulate realistic network delay (between 0.8s and 1.5s)
    const delay = Math.floor(Math.random() * 700) + 800;
    
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'model', content: botResponseText }]);
        setLoading(false);
    }, delay); 
  };

  // --- UI RENDERING ---
  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    return (
      <View key={index} style={[styles.messageContainer, isUser ? styles.userContainer : styles.aiContainer]}>
        {!isUser && (
            <Avatar.Icon size={30} icon="robot" style={{backgroundColor: theme.colors.primary, marginRight: 8}} />
        )}
        <Card style={[styles.messageCard, isUser ? {backgroundColor: theme.colors.primaryContainer, borderBottomRightRadius: 2} : {backgroundColor: 'white', borderBottomLeftRadius: 2}]}>
          <Card.Content style={{paddingVertical: 10, paddingHorizontal: 12}}>
            <Text style={[styles.messageText, isUser ? {color: theme.colors.onPrimaryContainer} : {color: 'black'}]}>
                {msg.content.replace(/\*\*/g, '')} 
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatList} 
        contentContainerStyle={{paddingVertical: 20, paddingBottom: keyboardHeight + 80}}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
        {messages.map(renderMessage)}
        {loading && (
            <View style={styles.loadingContainer}>
                <Avatar.Icon size={30} icon="robot" style={{backgroundColor: theme.colors.primary, marginRight: 8}} />
                <Card style={[styles.messageCard, {borderBottomLeftRadius: 2}]}>
                    <Card.Content style={{paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center'}}>
                        <ActivityIndicator size="small" color={theme.colors.primary} style={{marginRight: 10}} />
                        <Text style={{color: 'gray', fontStyle: 'italic'}}>UniBot is typing... ✨</Text>
                    </Card.Content>
                </Card>
            </View>
        )}
      </ScrollView>

      {/* ANIMATED INPUT CONTAINER */}
      <Animated.View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, bottom: inputContainerBottom }]}>
        <TextInput
          mode="outlined"
          placeholder="Ask UniBot something... ✨"
          value={input}
          onChangeText={setInput}
          style={styles.input}
          outlineStyle={{borderRadius: 25, borderColor: 'transparent'}}
          contentStyle={{backgroundColor: theme.colors.background}}
          disabled={loading}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false} // Keep keyboard open after sending
        />
        <IconButton
            icon="send"
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor="white"
            size={24}
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={{margin:0, marginLeft: 8}}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatList: { flex: 1, paddingHorizontal: 15 },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  userContainer: { justifyContent: 'flex-end' },
  aiContainer: { justifyContent: 'flex-start' },
  messageCard: {
    maxWidth: '85%',
    borderRadius: 18,
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  loadingContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 15
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10, // Base padding
  },
  input: {
    flex: 1,
    maxHeight: 50,
    justifyContent: 'center'
  },
});
