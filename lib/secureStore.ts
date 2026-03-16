// Native implementation — delegates to expo-secure-store.
// Metro auto-selects secureStore.web.ts on web/Electron builds.
export { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';
