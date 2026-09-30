export interface GradeMention {
    min:   number
    max:   number
    label: string
    color: string  // red | orange | yellow | green | blue | purple
}

export interface LevelConfig {
    scale:  number        // 10 or 20
    config: GradeMention[]
}

// ── Color helpers (Tailwind print-safe classes) ───────────────────────────────

const COLOR_PRINT: Record<string, { text: string; bg: string }> = {
    red:    { text: 'text-red-700',    bg: 'bg-red-50' },
    orange: { text: 'text-orange-700', bg: 'bg-orange-50' },
    yellow: { text: 'text-yellow-700', bg: 'bg-yellow-50' },
    green:  { text: 'text-green-700',  bg: 'bg-green-50' },
    blue:   { text: 'text-blue-700',   bg: 'bg-blue-50' },
    purple: { text: 'text-purple-700', bg: 'bg-purple-50' },
}

export function getMentionColors(color: string): { text: string; bg: string } {
    return COLOR_PRINT[color] ?? COLOR_PRINT.blue
}

// ── Core utilities ────────────────────────────────────────────────────────────

/** Returns the first mention whose range covers `score` (inclusive on both ends). */
export function getMention(score: number, mentions: GradeMention[]): GradeMention | null {
    if (!mentions?.length) return null
    // Use <= max so the last mention covers exactly the max value
    return mentions.find(m => score >= m.min && score <= m.max)
        ?? (score >= mentions[mentions.length - 1].max ? mentions[mentions.length - 1] : mentions[0])
}

/** Passing mark = half the scale. */
export function getDecision(avg: number, scale: number): 'ADMIS(E)' | 'REDOUBLANT(E)' {
    return avg >= scale / 2 ? 'ADMIS(E)' : 'REDOUBLANT(E)'
}

/** Weighted average from an array of { score, coefficient } objects. */
export function computeWeightedAverage(grades: { score: number; coefficient: number }[]): number {
    if (!grades.length) return 0
    const totalCoeff  = grades.reduce((s, g) => s + (g.coefficient ?? 1), 0)
    const totalPoints = grades.reduce((s, g) => s + (g.score * (g.coefficient ?? 1)), 0)
    return totalCoeff > 0 ? totalPoints / totalCoeff : 0
}

/**
 * Maps a class level string (from the `classes` table) to the key used in `grading_configs`.
 * The mapping is intentionally generous — partial matches are OK.
 */
export function levelToConfigKey(classLevel: string | null | undefined): string {
    if (!classLevel) return 'Collège'
    const l = classLevel.toLowerCase()
    if (l === 'maternelle' || l.includes('maternel')) return 'Maternelle'
    if (l === 'primaire'   || l.includes('primaire') || /\b(cp|ce|cm)\b/.test(l)) return 'Primaire'
    if (l === 'lycée'      || l.includes('lyc') || l.includes('terminal') || l.includes('seconde') || l.includes('première')) return 'Lycée'
    return 'Collège'
}

// Default configs used when `grading_configs` table has no data yet
export const DEFAULT_CONFIGS: Record<string, LevelConfig> = {
    Maternelle: {
        scale: 10,
        config: [
            { min: 0, max: 4,  label: 'Insuffisant',  color: 'red' },
            { min: 4, max: 6,  label: 'En progrès',   color: 'orange' },
            { min: 6, max: 8,  label: 'Satisfaisant', color: 'yellow' },
            { min: 8, max: 9,  label: 'Bien',         color: 'blue' },
            { min: 9, max: 10, label: 'Très Bien',    color: 'green' },
        ],
    },
    Primaire: {
        scale: 10,
        config: [
            { min: 0,   max: 4,  label: 'Insuffisant', color: 'red' },
            { min: 4,   max: 6,  label: 'Passable',    color: 'orange' },
            { min: 6,   max: 7,  label: 'Assez Bien',  color: 'yellow' },
            { min: 7,   max: 8.5,label: 'Bien',        color: 'blue' },
            { min: 8.5, max: 10, label: 'Très Bien',   color: 'green' },
        ],
    },
    Collège: {
        scale: 20,
        config: [
            { min: 0,  max: 6,  label: 'Insuffisant', color: 'red' },
            { min: 6,  max: 10, label: 'Passable',    color: 'orange' },
            { min: 10, max: 14, label: 'Assez Bien',  color: 'yellow' },
            { min: 14, max: 16, label: 'Bien',        color: 'blue' },
            { min: 16, max: 18, label: 'Très Bien',   color: 'green' },
            { min: 18, max: 20, label: 'Excellent',   color: 'purple' },
        ],
    },
    Lycée: {
        scale: 20,
        config: [
            { min: 0,  max: 6,  label: 'Insuffisant', color: 'red' },
            { min: 6,  max: 10, label: 'Passable',    color: 'orange' },
            { min: 10, max: 14, label: 'Assez Bien',  color: 'yellow' },
            { min: 14, max: 16, label: 'Bien',        color: 'blue' },
            { min: 16, max: 18, label: 'Très Bien',   color: 'green' },
            { min: 18, max: 20, label: 'Excellent',   color: 'purple' },
        ],
    },
}
