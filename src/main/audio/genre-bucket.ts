export const GENRE_BUCKETS = [
    'Hip Hop',
    'R&B',
    'Pop',
    'Rock',
    'Indie',
    'Electronic',
    'Country / Folk',
    'Other'
] as const

export type GenreBucket = typeof GENRE_BUCKETS[number]

interface Rule {
    bucket: GenreBucket
    matches: string[]
}

const RULES: Rule[] = [
    { bucket: 'Hip Hop', matches: ['hip hop', 'rap', 'trap', 'drill', 'grime'] },
    { bucket: 'R&B', matches: ['r&b', 'rnb', 'soul', 'neo soul', 'quiet storm', 'new jack swing'] },
    { bucket: 'Indie', matches: ['indie', 'dream pop', 'psychedelic', 'shoegaze', 'bedroom pop', 'art pop', 'lo-fi'] },
    { bucket: 'Electronic', matches: ['electronic', 'edm', 'house', 'techno', 'dance', 'synth-pop', 'synthpop', 'vaporwave', 'electropop', 'trance', 'drum and bass', 'dnb'] },
    { bucket: 'Rock', matches: ['rock', 'metal', 'punk', 'grunge', 'emo'] },
    { bucket: 'Country / Folk', matches: ['country', 'folk', 'americana', 'bluegrass', 'singer-songwriter'] },
    { bucket: 'Pop', matches: ['pop'] }
]

export function bucketSpotifyGenres(rawTags: string[] | null | undefined): GenreBucket[] {
    if (!rawTags || rawTags.length === 0) return []
    const result = new Set<GenreBucket>()
    for (const raw of rawTags) {
        if (!raw) continue
        const tag = raw.toLowerCase()
        for (const rule of RULES) {
            if (rule.matches.some(m => tag.includes(m))) {
                result.add(rule.bucket)
                break
            }
        }
    }
    return Array.from(result)
}
