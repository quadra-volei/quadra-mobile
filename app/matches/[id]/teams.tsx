import { Text, View } from 'react-native';

// S13 — Team setup (placeholder). Reached from S12 "Montar os times" with
// { id, teamCount, perTeam, drawMode } route params. Replaced by the S13 screen.
export default function TeamsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-light">
      <Text className="text-h1 text-text-primary">Montar os times</Text>
    </View>
  );
}
