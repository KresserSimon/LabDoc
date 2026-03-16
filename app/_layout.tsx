import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDB } from '../lib/db';

export default function RootLayout() {
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#f4f4f0" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#f4f4f0' },
          headerTintColor: '#1a5fa8',
          headerTitleStyle: { fontFamily: 'monospace', fontWeight: '700' },
          contentStyle: { backgroundColor: '#f4f4f0' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="versuch/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="versuch/[id]/index"
          options={{ headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
