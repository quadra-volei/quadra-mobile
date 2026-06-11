import { Redirect } from 'expo-router';

export default function Index() {
  // Placeholder: auth check logic will be added when S1 Splash is implemented
  return <Redirect href="/(auth)/login" />;
}
