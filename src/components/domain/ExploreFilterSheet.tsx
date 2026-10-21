import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Slider } from '@/components/ui/Slider';
import { ToggleField } from '@/components/ui/ToggleField';
import {
  DEFAULT_FILTERS,
  applyFilters,
  toggle,
  type ExploreFilters,
  type Sort,
  type When,
} from '@/features/explore/lib/filters';
import { LEVEL_BADGE } from '@/features/matches/lib/levelBadge';
import type { MatchFormat, MatchLevel, NearbyMatch } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'near', label: 'Mais perto' },
  { id: 'soon', label: 'Mais cedo' },
];
const WHENS: { id: When; label: string }[] = [
  { id: 'any', label: 'Qualquer dia' },
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'weekend', label: 'Fim de semana' },
];
// The slider runs 1–50 km; its end is "any distance", which the API's 50 km cap already is.
const MAX_KM = 50;
const distanceText = (km: number) => (km >= MAX_KM ? 'Qualquer distância' : `Até ${km} km`);
const FORMATS: MatchFormat[] = ['2X2', '4X4', '6X6'];
const LEVELS: MatchLevel[] = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'];
const PRICES: { max: number | null; label: string }[] = [
  { max: null, label: 'Qualquer' },
  { max: 0, label: 'Grátis' },
  { max: 20, label: 'Até R$ 20' },
  { max: 40, label: 'Até R$ 40' },
];

export type ExploreFilterSheetProps = {
  visible: boolean;
  /** The filters applied on screen; the sheet edits a copy until "Ver". */
  value: ExploreFilters;
  /** The loaded matches, to count the draft's results live. */
  source: NearbyMatch[];
  onApply: (next: ExploreFilters) => void;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="font-body-bold text-eyebrow text-text-primary uppercase">{title}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

/**
 * Explore's full filter sheet (Airbnb-style): sections of chips, a sticky
 * footer with "Limpar" and "Ver N partidas" counting the draft live. Nothing
 * applies until "Ver"; closing discards the draft. Search text is kept.
 */
export function ExploreFilterSheet({ visible, value, source, onApply, onClose }: ExploreFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const count = useMemo(() => applyFilters(source, draft).length, [source, draft]);
  const set = (patch: Partial<ExploreFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable
          testID="explore-filter-sheet"
          onPress={() => {}}
          className="max-h-[88%] rounded-t-card bg-bg-light"
        >
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <Text className="font-display text-h2 text-text-primary uppercase">Filtros</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar filtros"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-chip bg-white shadow-card"
            >
              <X size={20} color={colors.surfaceDark} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="px-4 pb-6">
            <Section title="Ordenar por">
              {SORTS.map((s) => (
                <FilterChip key={s.id} label={s.label} selected={draft.sort === s.id} onPress={() => set({ sort: s.id })} />
              ))}
            </Section>
            <Section title="Quando">
              {WHENS.map((w) => (
                <FilterChip key={w.id} label={w.label} selected={draft.when === w.id} onPress={() => set({ when: w.id })} />
              ))}
            </Section>
            <View className="mt-5">
              <View className="flex-row items-center justify-between">
                <Text className="font-body-bold text-eyebrow text-text-primary uppercase">Distância</Text>
                <Text className="font-body-bold text-caption text-primary" testID="explore-filter-distance">
                  {distanceText(draft.maxKm ?? MAX_KM)}
                </Text>
              </View>
              <Slider
                value={draft.maxKm ?? MAX_KM}
                min={1}
                max={MAX_KM}
                onChange={(km) => set({ maxKm: km >= MAX_KM ? null : km })}
                accessibilityLabel="Distância máxima"
                valueText={distanceText}
                testID="explore-filter-distance-slider"
              />
            </View>
            <Section title="Formato">
              {FORMATS.map((f) => (
                <FilterChip
                  key={f}
                  label={f.toLowerCase()}
                  selected={draft.formats.includes(f)}
                  onPress={() => set({ formats: toggle(draft.formats, f) })}
                />
              ))}
            </Section>
            <Section title="Nível">
              {LEVELS.map((l) => (
                <FilterChip
                  key={l}
                  label={LEVEL_BADGE[l].label}
                  selected={draft.levels.includes(l)}
                  onPress={() => set({ levels: toggle(draft.levels, l) })}
                />
              ))}
            </Section>
            <Section title="Preço">
              {PRICES.map((p) => (
                <FilterChip key={p.label} label={p.label} selected={draft.maxPrice === p.max} onPress={() => set({ maxPrice: p.max })} />
              ))}
            </Section>
            <View className="mt-5">
              <ToggleField
                title="Só com vaga aberta"
                caption="Esconde as partidas lotadas"
                value={draft.withSpots}
                onValueChange={(withSpots) => set({ withSpots })}
              />
            </View>
          </ScrollView>

          {/* Sticky footer */}
          <View
            className="flex-row items-center gap-3 border-t border-line bg-bg-light px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <Button variant="ghost" onPress={() => setDraft({ ...DEFAULT_FILTERS, query: draft.query })}>
              Limpar
            </Button>
            <View className="flex-1">
              <Button variant="primary" onPress={() => onApply(draft)} disabled={count === 0} testID="explore-filter-apply">
                {count === 0 ? 'Nenhuma partida' : `Ver ${count} ${count === 1 ? 'partida' : 'partidas'}`}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
