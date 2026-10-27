import { Check, Scale, Shuffle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TeamRoster } from '@/components/domain/TeamRoster';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StepperField } from '@/components/ui/StepperField';
import type { TeamsSetup as TeamsSetupState } from '@/features/matches/lib/useTeamsSetup';
import type { DrawMode } from '@/features/matches/types/matchDetail';
import { colors } from '@/theme/colors';

// What each draw mode asks the backend for (drawTeams.ts): MANUAL is a random
// draw, AUTO balances the teams by level.
const DRAW_MODES: {
  mode: DrawMode;
  title: string;
  caption: string;
  testID: string;
}[] = [
  {
    mode: 'MANUAL',
    title: 'Aleatório',
    caption: 'Times sorteados ao acaso',
    testID: 'draw-mode-manual',
  },
  {
    mode: 'AUTO',
    title: 'Equilibrado',
    caption: 'Times equilibrados por nível',
    testID: 'draw-mode-auto',
  },
];

const DRAW_MODE_ICON: Record<DrawMode, ReactNode> = {
  MANUAL: <Shuffle size={20} color={colors.primary} />,
  AUTO: <Scale size={20} color={colors.primary} />,
};

export type TeamsSetupProps = {
  setup: TeamsSetupState;
  testID?: string;
};

/**
 * The organizer's teams, under the confirmed players of the match (S12,
 * Confirmados tab). Before a draw: how many teams, players per team and how to
 * draw them (the "Sortear times" button is the footer's). After it: the teams,
 * a tap on a player moves them, "Refazer sorteio" brings the settings back.
 *
 * Presentational: everything comes from `useTeamsSetup`.
 */
export function TeamsSetup({ setup, testID = 'teams-setup' }: TeamsSetupProps) {
  const {
    confirmedCount,
    teamCount,
    perTeam,
    drawMode,
    slots,
    tooFew,
  } = setup;

  const tooFewHint =
    confirmedCount === 0
      ? 'Ninguém confirmou presença ainda. Sem confirmados não há times.'
      : confirmedCount === 1
        ? 'Só 1 confirmado: são precisos pelo menos 2 para montar os times.'
        : `Com ${confirmedCount} confirmados dá para montar no máximo ${confirmedCount} times.`;
  const capacityHint = tooFew
    ? null
    : confirmedCount > slots
      ? `${confirmedCount - slots} ${confirmedCount - slots === 1 ? 'fica' : 'ficam'} de fora neste sorteio.`
      : confirmedCount < slots
        ? `${confirmedCount === slots - 1 ? 'Falta 1' : `Faltam ${slots - confirmedCount}`} para completar os times.`
        : null;

  if (setup.loading) {
    return (
      <View className="mt-8 gap-3" testID={`${testID}-loading`}>
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-28" />
      </View>
    );
  }

  return (
    <View className="mt-8" testID={testID}>
      <View className="flex-row items-center">
        <Text className="flex-1 font-display text-h2 text-surface-dark uppercase">
          Times
        </Text>
        {setup.drawn && !setup.redrawing ? (
          <Button variant="ghost" onPress={setup.startRedraw} testID="redraw-teams">
            Refazer sorteio
          </Button>
        ) : null}
        {setup.redrawing ? (
          <Button variant="ghost" onPress={setup.cancelRedraw} testID="keep-teams">
            Manter os times
          </Button>
        ) : null}
      </View>

      {setup.configuring ? (
        <View className="mt-2">
          <Text className="font-body-semibold text-body-bold text-text-primary">
            Quantos times
          </Text>
          <View className="mt-2 flex-row gap-2">
            {([2, 3, 4] as const).map((count) => (
              <FilterChip
                key={count}
                label={`${count} times`}
                selected={teamCount === count}
                onPress={() => setup.setTeamCount(count)}
                testID={`team-count-${count}`}
              />
            ))}
          </View>

          <View className="mt-4 flex-row">
            <StepperField
              label="Jogadores por time"
              value={perTeam}
              onChange={setup.setPerTeam}
              min={1}
              testID="per-team-stepper"
            />
          </View>
          <Text className="mt-1 font-body text-caption text-text-muted">
            {confirmedCount} confirmados no total
          </Text>
          {capacityHint ? (
            <Text
              className="mt-1 font-body-semibold text-caption text-text-primary"
              testID="capacity-hint"
            >
              {capacityHint}
            </Text>
          ) : null}
          {tooFew ? (
            <Text
              className="mt-1 font-body-semibold text-caption text-danger"
              testID="too-few-hint"
            >
              {tooFewHint}
            </Text>
          ) : null}

          <Text className="mt-5 font-body-semibold text-body-bold text-text-primary">
            Como sortear os times
          </Text>
          {DRAW_MODES.map(({ mode, title, caption, testID: modeTestID }) => (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: drawMode === mode }}
              onPress={() => setup.setDrawMode(mode)}
              testID={modeTestID}
              className={`mt-2 flex-row items-center gap-3 rounded-card border p-4 ${
                drawMode === mode ? 'border-primary bg-primary/5' : 'border-line bg-white'
              }`}
            >
              {DRAW_MODE_ICON[mode]}
              <View className="flex-1">
                <Text className="font-body-extrabold text-h3 text-text-primary">{title}</Text>
                <Text className="font-body text-caption text-text-muted">{caption}</Text>
              </View>
              {drawMode === mode ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
          ))}

          {/* Teams are optional (API DECISIONS #86); starting this way waits
              for the same window as any start. */}
          {setup.drawn ? null : (
            <View className="mt-4">
              <Button
                variant="outline"
                onPress={setup.handlePlayWithoutTeams}
                loading={setup.startingFree}
                disabled={!setup.kickoffOpen}
                testID="play-without-teams"
              >
                Jogar sem times fixos
              </Button>
              {setup.kickoffOpen ? null : (
                <Text
                  className="mt-1 text-center font-body text-caption text-text-muted"
                  testID="play-without-teams-waiting"
                >
                  {setup.waitingLabel}
                </Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <View>
          <Text
            className="font-body text-caption text-text-muted"
            testID="team-config-summary"
          >
            {setup.teams.length} times · toque em um jogador para trocá-lo de time.
          </Text>

          <View className="mt-2 gap-3">
            {setup.teams.map((team, index) => (
              <TeamRoster
                key={team.id}
                teamId={team.id}
                teamName={team.name || `Time ${team.number}`}
                players={team.players}
                colorIndex={index}
                onPlayerPress={
                  setup.moving ? undefined : (player) => setup.handleMovePlayer(player, team.id)
                }
                testID={`team-roster-${team.id}`}
              />
            ))}
          </View>

          {setup.sittingOut.length > 0 ? (
            <Text className="mt-4 font-body text-caption text-text-muted" testID="sitting-out">
              De fora neste sorteio: {setup.sittingOut.map((p) => p.name).join(', ')}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
