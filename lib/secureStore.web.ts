/**
 * Web/Electron shim for expo-secure-store.
 * On desktop we use localStorage (not truly secure, but functional).
 * Production deployments should use the OS keychain via Electron's safeStorage.
 */

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(`labdoc_secure_${key}`);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(`labdoc_secure_${key}`, value);
  } catch {}
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(`labdoc_secure_${key}`);
  } catch {}
}
