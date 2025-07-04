import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import MainApp from './src/MainApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
      <StatusBar style="dark" backgroundColor="#f3f4f6" />
    </SafeAreaProvider>
  );
}

// Register the main component
if (Platform.OS === 'web') {
  registerRootComponent(App);
}