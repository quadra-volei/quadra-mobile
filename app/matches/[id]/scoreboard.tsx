import { Text, View } from 'react-native';

// S14 — Scoreboard (placeholder). Reached from S13 "Começar partida" with
// route params { id, teamCount, perTeam, drawMode }. This screen handles both
// 2-team scoreboard and 3+-team set-picker (S13.5) conditional rendering.
// Deferred to future iteration; MVP stub returns placeholder.
export default function ScoreboardScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-light">
      <Text className="text-h1 text-text-primary">Placar</Text>
    </View>
  );
}
