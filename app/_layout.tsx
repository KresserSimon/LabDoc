import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDB } from '../lib/db';
import { SettingsProvider } from '../contexts/SettingsContext';

export default function RootLayout() {
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
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
        <Stack.Screen name="settings/sync-protokoll" options={{ headerShown: false }} />
        <Stack.Screen name="settings/diagnose"        options={{ headerShown: false }} />
        <Stack.Screen name="settings/changelog"       options={{ headerShown: false }} />
      </Stack>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
