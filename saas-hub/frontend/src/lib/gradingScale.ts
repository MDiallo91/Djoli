/**
 * lib/gradingScale.ts
 * Barème et mentions par niveau — copie des valeurs par défaut du desktop
 * (Desktop/shared/services/schoolService.ts → DEFAULT_GRADING_CONFIGS), pour
 * que le web affiche les mêmes « /10 » ou « /20 » et les mêmes mentions.
 * Le backend applique le même barème à l'enregistrement (notesService.scaleForLevel).
 * Consommé par : GradesSection, BulletinSection
 */

export type GradeScale = 10 | 20;

interface MentionRange { min: number; max: number; label: string; color: string }

const COLORS: Record<string, string> = {
  red: 'text-red-600', orange: 'text-amber-600', yellow: 'text-primary-600',
  blue: 'text-blue-600', green: 'text-secondary-600', purple: 'text-purple-600',
};

const LEVEL_CONFIGS: Record<string, { scale: GradeScale; ranges: MentionRange[] }> = {
  Maternelle: { scale: 10, ranges: [
    { min: 0, max: 4,  label: 'Insuffisant',  color: 'red' },
    { min: 4, max: 6,  label: 'En progrès',   color: 'orange' },
    { min: 6, max: 8,  label: 'Satisfaisant', color: 'yellow' },
    { min: 8, max: 9,  label: 'Bien',         color: 'blue' },
    { min: 9, max: 10, label: 'Très Bien',    color: 'green' },
  ] },
  Primaire: { scale: 10, ranges: [
    { min: 0,   max: 4,   label: 'Insuffisant', color: 'red' },
    { min: 4,   max: 6,   label: 'Passable',    color: 'orange' },
    { min: 6,   max: 7,   label: 'Assez Bien',  color: 'yellow' },
    { min: 7,   max: 8.5, label: 'Bien',        color: 'blue' },
    { min: 8.5, max: 10,  label: 'Très Bien',   color: 'green' },
  ] },
};
// Collège et Lycée : même barème sur 20
const SECONDARY: { scale: GradeScale; ranges: MentionRange[] } = { scale: 20, ranges: [
  { min: 0,  max: 6,  label: 'Insuffisant', color: 'red' },
  { min: 6,  max: 10, label: 'Passable',    color: 'orange' },
  { min: 10, max: 14, label: 'Assez Bien',  color: 'yellow' },
  { min: 14, max: 16, label: 'Bien',        color: 'blue' },
  { min: 16, max: 18, label: 'Très Bien',   color: 'green' },
  { min: 18, max: 20, label: 'Excellent',   color: 'purple' },
] };

const configFor = (level?: string | null) => LEVEL_CONFIGS[level ?? ''] ?? SECONDARY;

/** Barème de la classe : 10 en maternelle/primaire, 20 sinon. */
export function scaleForLevel(level?: string | null): GradeScale {
  return configFor(level).scale;
}

/** Mention d'une note/moyenne selon le niveau (seuils du desktop). */
export function getMention(value: number | null, level?: string | null): { label: string; color: string } {
  if (value === null || !Number.isFinite(value)) return { label: '—', color: 'text-gray-400' };
  const ranges = configFor(level).ranges;
  const r = ranges.find(x => value >= x.min && value < x.max) ?? (value >= ranges[ranges.length - 1].min ? ranges[ranges.length - 1] : ranges[0]);
  return { label: r.label, color: COLORS[r.color] ?? 'text-gray-900' };
}
