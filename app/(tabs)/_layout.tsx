import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { fontFamily: 'monospace', fontWeight: '700', color: Colors.primary },
        headerTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'VERSUCHE',
          tabBarLabel: 'Versuche',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="≡" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'NEU',
          tabBarLabel: 'Neu',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="+" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'EINSTELLUNGEN',
          tabBarLabel: 'Einstellungen',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="⚙" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color, size }: { label: string; color: string; size: number }) {
  const { Text } = require('react-native');
  return (
    <Text style={{ fontSize: size, color, fontFamily: 'monospace', lineHeight: size + 4 }}>
      {label}
    </Text>
  );
}
