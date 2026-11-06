import { router } from 'expo-router';
import { useState } from 'react';

import { dialog } from '@/components/ui/Dialog';
import { useDrawTeams, useMatchTeams, useMovePlayer } from '@/features/matches/api/drawTeams';
import { useStartFreeGame, useStartSet } from '@/features/matches/api/liveGame';
import { kickoffWaitingLabel, useKickoffOpen } from '@/features/matches/lib/kickoff';
import type { DrawMode, MatchDetail, PresencePlayer } from '@/features/matches/types/matchDetail';
import type { Team } from '@/features/matches/types/team';

const NO_PLAYERS: PresencePlayer[] = [];

/**
 * The organizer's teams on the Confirmados tab of the match (S12): the draw
 * settings, the drawn teams (kept on the backend) and the start of the game.
 * Drawing and fixing the teams works any time after confirmations open; only
 * the start waits for its window (15 minutes before the match time), so the
 * footer says when it opens instead of offering a start that fails.
 */
export function useTeamsSetup(
  matchId: string,
  match: MatchDetail | undefined,
  options: { enabled: boolean },
) {
  const players = match?.players ?? NO_PLAYERS;
  const confirmedCount = players.filter((p) => p.status === 'CONFIRMADO').length;
  const defaults = match?.teamConfig;

  const teamsQuery = useMatchTeams(matchId, players, { enabled: options.enabled });
  const draw = useDrawTeams(matchId);
  const movePlayer = useMovePlayer(matchId);
  const startSet = useStartSet(matchId);
  const startFree = useStartFreeGame(matchId);
  const kickoffOpen = useKickoffOpen(match?.startsAt);

  // The configuration is what the organizer picked, or the match's default
  // until they pick something.
  const [teamCountPick, setTeamCount] = useState<2 | 3 | 4 | null>(null);
  const [perTeamPick, setPerTeam] = useState<number | null>(null);
  const [drawModePick, setDrawMode] = useState<DrawMode | null>(null);
  const teamCount = teamCountPick ?? defaults?.teamCount ?? 2;
  const perTeam = perTeamPick ?? defaults?.perTeam ?? 4;
  const drawMode = drawModePick ?? defaults?.drawMode ?? 'MANUAL';

  // "Refazer sorteio" brings the settings back; the drawn teams stay on the
  // backend until a new draw replaces them.
  const [redrawing, setRedrawing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const teams: Team[] = teamsQuery.data ?? [];
  const drawn = teams.length > 0;
  const configuring = !drawn || redrawing;

  // Who fits: the draw fills `teamCount × perTeam` places, the rest sits out.
  const slots = teamCount * perTeam;
  // Every team needs at least one player: with fewer confirmed than teams the
  // draw is not offered (the backend refuses it too).
  const tooFew = confirmedCount < teamCount;
  const drawnIds = new Set(teams.flatMap((team) => team.players.map((p) => p.id)));
  const sittingOut = players.filter((p) => p.status === 'CONFIRMADO' && !drawnIds.has(p.id));

  const handleDraw = () =>
    draw.mutate(
      { players, request: { teamCount, perTeam, drawMode } },
      {
        onSuccess: () => setRedrawing(false),
        onError: (error) =>
          dialog.alert(
            'Erro ao sortear',
            error.message || 'Não foi possível montar os times. Tente novamente.',
          ),
      },
    );

  // After the draw the organizer can still fix the teams: tap a player, pick
  // the team they go to, or the bench (Reservas: confirmed, out of the game,
  // ready to come in). Saved on the backend, which answers with every team.
  const handleMovePlayer = (player: PresencePlayer, fromTeamId: string | null) => {
    const move = (teamId: string | null) =>
      movePlayer.mutate(
        { players, playerId: player.id, teamId },
        { onError: (error) => dialog.alert('Erro ao mover', error.message) },
      );
    dialog.alert(`Mover ${player.name} para`, undefined, [
      ...teams
        .filter((team) => team.id !== fromTeamId)
        .map((team) => ({ text: team.name || `Time ${team.number}`, onPress: () => move(team.id) })),
      ...(fromTeamId ? [{ text: 'Reservas', onPress: () => move(null) }] : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const goToScoreboard = () =>
    router.push({ pathname: '/matches/[id]/scoreboard', params: { id: matchId } });

  // Teams are optional: the match can go on as one list, teams formed on court
  // (API DECISIONS #86). Same window as any start.
  const handlePlayWithoutTeams = () =>
    startFree.mutate(undefined, {
      onSuccess: goToScoreboard,
      onError: (error) => dialog.alert('Não foi possível começar', error.message),
    });

  const handleStartMatch = () => {
    // Moving players around can leave a team empty.
    if (teams.some((team) => team.players.length === 0)) {
      dialog.alert(
        'Tem time sem jogador',
        'Todo time precisa de pelo menos 1 jogador. Mova alguém para ele ou refaça o sorteio.',
      );
      return;
    }
    dialog.alert('Pronto para começar esta partida?', '', [
      { text: 'Revisar', style: 'cancel' },
      {
        text: 'Sim, começar',
        onPress: async () => {
          setIsStarting(true);
          try {
            // Two teams: nothing to pick, so the game starts right here. With
            // three or more the organizer first picks who plays the first set
            // (S13.5, on the scoreboard route).
            const [first, second] = teams;
            if (teams.length === 2 && first && second) {
              await startSet.mutateAsync([first.id, second.id]);
            }
            goToScoreboard();
          } catch (err) {
            dialog.alert(
              'Erro ao iniciar',
              err instanceof Error
                ? err.message
                : 'Não foi possível começar a partida. Tente novamente.',
            );
          } finally {
            setIsStarting(false);
          }
        },
      },
    ]);
  };

  return {
    loading: teamsQuery.isPending && options.enabled,
    teams,
    drawn,
    configuring,
    redrawing,
    confirmedCount,
    teamCount,
    perTeam,
    drawMode,
    slots,
    tooFew,
    sittingOut,
    kickoffOpen,
    /** "Aguardando horário · libera hoje às 19h45", for while the start waits. */
    waitingLabel: match ? kickoffWaitingLabel(match.startsAt) : '',
    drawing: draw.isPending,
    moving: movePlayer.isPending,
    startingFree: startFree.isPending,
    isStarting,
    setTeamCount,
    setPerTeam,
    setDrawMode,
    startRedraw: () => setRedrawing(true),
    cancelRedraw: () => setRedrawing(false),
    handleDraw,
    handleMovePlayer,
    handlePlayWithoutTeams,
    handleStartMatch,
  };
}

export type TeamsSetup = ReturnType<typeof useTeamsSetup>;
