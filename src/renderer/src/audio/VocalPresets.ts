import { VoiceEffects } from './VoiceEffectsTypes'

export type VocalPresetEffects = Omit<VoiceEffects, 'key' | 'mode' | 'tempo' | 'micLevel'>

export type PresetCategory = 'utility' | 'hip-hop' | 'r&b' | 'pop' | 'rock' | 'electronic'

export interface VocalPreset {
    id: string
    name: string
    category: PresetCategory
    description: string
    artistId?: string // Spotify artist ID for fetching profile image
    effects: VocalPresetEffects
}

export const PRESET_CATEGORIES: { key: PresetCategory; label: string }[] = [
    { key: 'utility', label: 'Utility' },
    { key: 'hip-hop', label: 'Hip-Hop' },
    { key: 'r&b', label: 'R&B' },
    { key: 'pop', label: 'Pop' },
    { key: 'rock', label: 'Rock' },
    { key: 'electronic', label: 'Electronic' },
]

export const BUILT_IN_PRESETS: VocalPreset[] = [
    // ===== UTILITY =====
    {
        id: 'raw-natural',
        name: 'Raw / Natural',
        category: 'utility',
        description: 'No processing, clean vocal passthrough',
        effects: {
            pitchCorrection: { enabled: false, strength: 0 },
            compressor: { enabled: false, threshold: -24, ratio: 4, attack: 0.01, release: 0.1 },
            eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: false, time: 250, feedback: 25, mix: 0 },
            reverb: { enabled: false, decay: 2.5, preDelay: 20, mix: 0 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'karaoke-standard',
        name: 'Karaoke Standard',
        category: 'utility',
        description: 'Classic karaoke: light reverb, gentle compression, subtle pitch help',
        effects: {
            pitchCorrection: { enabled: true, strength: 30 },
            compressor: { enabled: true, threshold: -20, ratio: 3, attack: 0.01, release: 0.15 },
            eq: { enabled: true, lowGain: -2, midGain: 3, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 2.0, preDelay: 25, mix: 30 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: true, threshold: -55 },
        }
    },

    // ===== HIP-HOP =====
    {
        id: 't-pain',
        name: 'T-Pain',
        category: 'hip-hop',
        description: 'Heavy autotune pioneer, warm reverb, light chorus shimmer',
        artistId: '3aQeKQSyrW4qWr35idm0cy',
        effects: {
            pitchCorrection: { enabled: true, strength: 100 },
            compressor: { enabled: true, threshold: -18, ratio: 4, attack: 0.005, release: 0.1 },
            eq: { enabled: true, lowGain: 3, midGain: 2, highGain: 3 },
            chorus: { enabled: true, rate: 1.0, depth: 0.12, mix: 15 },
            delay: { enabled: true, time: 220, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 1.8, preDelay: 15, mix: 25 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'travis-scott',
        name: 'Travis Scott',
        category: 'hip-hop',
        description: 'Heavy autotune, dark atmospheric reverb, ad-lib delay trails',
        artistId: '0Y5tJX1MQlPlqiwlOH1tJY',
        effects: {
            pitchCorrection: { enabled: true, strength: 90 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.003, release: 0.08 },
            eq: { enabled: true, lowGain: -3, midGain: 3, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 350, feedback: 35, mix: 18 },
            reverb: { enabled: true, decay: 3.2, preDelay: 25, mix: 38 },
            distortion: { enabled: true, drive: 12, mix: 10 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'kanye-west',
        name: 'Kanye West (808s)',
        category: 'hip-hop',
        description: 'Emotional autotune, punchy compression, stadium reverb',
        artistId: '5K4W6rqBFWDnAN6FQUkS6x',
        effects: {
            pitchCorrection: { enabled: true, strength: 80 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.005, release: 0.12 },
            eq: { enabled: true, lowGain: -1, midGain: 3, highGain: 3 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 300, feedback: 20, mix: 12 },
            reverb: { enabled: true, decay: 2.8, preDelay: 20, mix: 32 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'kendrick-lamar',
        name: 'Kendrick Lamar',
        category: 'hip-hop',
        description: 'Crisp and dry, tight compression, vocal clarity',
        artistId: '2YZyLoL8N0Wb9xBt1NhZWg',
        effects: {
            pitchCorrection: { enabled: false, strength: 0 },
            compressor: { enabled: true, threshold: -16, ratio: 5, attack: 0.003, release: 0.08 },
            eq: { enabled: true, lowGain: -3, midGain: 5, highGain: 6 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 1.2, preDelay: 10, mix: 15 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: true, threshold: -45 },
        }
    },
    {
        id: 'playboi-carti',
        name: 'Playboi Carti',
        category: 'hip-hop',
        description: 'Aggressive autotune, distorted feel, chaotic ad-lib delays',
        artistId: '699OTQXzgjhIYAHMy9RyPD',
        effects: {
            pitchCorrection: { enabled: true, strength: 95 },
            compressor: { enabled: true, threshold: -22, ratio: 7, attack: 0.002, release: 0.06 },
            eq: { enabled: true, lowGain: -2, midGain: -1, highGain: 6 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 200, feedback: 35, mix: 22 },
            reverb: { enabled: true, decay: 2.5, preDelay: 12, mix: 30 },
            distortion: { enabled: true, drive: 28, mix: 20 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'mf-doom',
        name: 'MF DOOM',
        category: 'hip-hop',
        description: 'Lo-fi, gritty, low-mid heavy, minimal processing',
        artistId: '2pAWfrd7WFF3XhVt9GoKjQ',
        effects: {
            pitchCorrection: { enabled: false, strength: 0 },
            compressor: { enabled: true, threshold: -14, ratio: 3, attack: 0.01, release: 0.2 },
            eq: { enabled: true, lowGain: 3, midGain: 2, highGain: -5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 0.8, preDelay: 5, mix: 15 },
            distortion: { enabled: true, drive: 15, mix: 12 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },

    {
        id: 'drake',
        name: 'Drake',
        category: 'hip-hop',
        description: 'Smooth melodic rap, warm R&B tone, polished reverb, subtle autotune',
        artistId: '3TVXtAsR1Inumwj472S9r4',
        effects: {
            pitchCorrection: { enabled: true, strength: 30 },
            compressor: { enabled: true, threshold: -18, ratio: 4, attack: 0.006, release: 0.12 },
            eq: { enabled: true, lowGain: 2, midGain: 3, highGain: 4 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 220, feedback: 18, mix: 10 },
            reverb: { enabled: true, decay: 2.2, preDelay: 18, mix: 25 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'kanye-west-rap',
        name: 'Kanye West (Rap)',
        category: 'hip-hop',
        description: 'Aggressive rap delivery, punchy compression, crisp presence',
        artistId: '5K4W6rqBFWDnAN6FQUkS6x',
        effects: {
            pitchCorrection: { enabled: false, strength: 0 },
            compressor: { enabled: true, threshold: -18, ratio: 5, attack: 0.004, release: 0.08 },
            eq: { enabled: true, lowGain: -1, midGain: 4, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 1.5, preDelay: 12, mix: 18 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: true, threshold: -45 },
        }
    },
    {
        id: 'asap-rocky',
        name: 'A$AP Rocky',
        category: 'hip-hop',
        description: 'Smooth flow, cloud rap reverb, laid-back compression',
        artistId: '13ubrt8QOOCPljQ2FL1Kca',
        effects: {
            pitchCorrection: { enabled: true, strength: 20 },
            compressor: { enabled: true, threshold: -18, ratio: 4, attack: 0.005, release: 0.1 },
            eq: { enabled: true, lowGain: 1, midGain: 2, highGain: 4 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 280, feedback: 25, mix: 14 },
            reverb: { enabled: true, decay: 2.8, preDelay: 20, mix: 30 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'j-cole',
        name: 'J. Cole',
        category: 'hip-hop',
        description: 'Clean lyrical delivery, natural tone, minimal processing',
        artistId: '6l3HvQ5sa6mXTsMTB19rO5',
        effects: {
            pitchCorrection: { enabled: false, strength: 0 },
            compressor: { enabled: true, threshold: -16, ratio: 4, attack: 0.004, release: 0.1 },
            eq: { enabled: true, lowGain: -2, midGain: 4, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 1.4, preDelay: 12, mix: 16 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: true, threshold: -48 },
        }
    },
    {
        id: 'bad-bunny',
        name: 'Bad Bunny',
        category: 'hip-hop',
        description: 'Reggaeton vocal, warm autotune, punchy low-end, rhythmic delay',
        artistId: '4q3ewBCX7sLwd24euuV69X',
        effects: {
            pitchCorrection: { enabled: true, strength: 55 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.004, release: 0.08 },
            eq: { enabled: true, lowGain: 3, midGain: 2, highGain: 3 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 250, feedback: 22, mix: 12 },
            reverb: { enabled: true, decay: 2.0, preDelay: 15, mix: 24 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'future',
        name: 'Future',
        category: 'hip-hop',
        description: 'Heavy melodic autotune, dark reverb, signature mumble rap tone',
        artistId: '1RyvyyTE3xzB2ZywiAwp0i',
        effects: {
            pitchCorrection: { enabled: true, strength: 85 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.003, release: 0.08 },
            eq: { enabled: true, lowGain: 2, midGain: 1, highGain: 4 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 300, feedback: 28, mix: 15 },
            reverb: { enabled: true, decay: 2.8, preDelay: 18, mix: 32 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'lil-uzi-vert',
        name: 'Lil Uzi Vert',
        category: 'hip-hop',
        description: 'Energetic melodic rap, bright autotune, punchy highs',
        artistId: '4O15NlyKLIASxsJ0PrXPfz',
        effects: {
            pitchCorrection: { enabled: true, strength: 80 },
            compressor: { enabled: true, threshold: -20, ratio: 6, attack: 0.002, release: 0.06 },
            eq: { enabled: true, lowGain: -1, midGain: 0, highGain: 7 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 180, feedback: 30, mix: 18 },
            reverb: { enabled: true, decay: 2.2, preDelay: 12, mix: 28 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'pop-smoke',
        name: 'Pop Smoke',
        category: 'hip-hop',
        description: 'Deep Brooklyn drill voice, heavy low-end, gritty compression',
        artistId: '0eDvMgVFoNV3TpwtrVCoTj',
        effects: {
            pitchCorrection: { enabled: false, strength: 0 },
            compressor: { enabled: true, threshold: -18, ratio: 6, attack: 0.003, release: 0.08 },
            eq: { enabled: true, lowGain: 5, midGain: 2, highGain: -2 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 200, feedback: 20, mix: 10 },
            reverb: { enabled: true, decay: 1.8, preDelay: 10, mix: 22 },
            distortion: { enabled: true, drive: 12, mix: 8 },
            noiseGate: { enabled: true, threshold: -42 },
        }
    },

    // ===== R&B =====
    {
        id: 'frank-ocean',
        name: 'Frank Ocean',
        category: 'r&b',
        description: 'Subtle, clean, intimate with light reverb, airy delay',
        artistId: '2h93pZq0e7k5yf4dywlkpM',
        effects: {
            pitchCorrection: { enabled: true, strength: 15 },
            compressor: { enabled: true, threshold: -18, ratio: 2.5, attack: 0.01, release: 0.2 },
            eq: { enabled: true, lowGain: -2, midGain: 1, highGain: 4 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 250, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 2.0, preDelay: 20, mix: 22 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'the-weeknd',
        name: 'The Weeknd',
        category: 'r&b',
        description: 'Clean 80s-tinged R&B, polished presence, retro chorus shimmer',
        artistId: '1Xyo4u8uXC1ZmMpatF05PJ',
        effects: {
            pitchCorrection: { enabled: true, strength: 25 },
            compressor: { enabled: true, threshold: -18, ratio: 3.5, attack: 0.006, release: 0.12 },
            eq: { enabled: true, lowGain: 1, midGain: 3, highGain: 5 },
            chorus: { enabled: true, rate: 0.6, depth: 0.12, mix: 18 },
            delay: { enabled: true, time: 200, feedback: 18, mix: 12 },
            reverb: { enabled: true, decay: 2.5, preDelay: 22, mix: 28 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'sza',
        name: 'SZA',
        category: 'r&b',
        description: 'Breathy, warm, lush reverb with gentle chorus width',
        artistId: '7tYKF4w9nC0nq9CsPZTHyP',
        effects: {
            pitchCorrection: { enabled: true, strength: 20 },
            compressor: { enabled: true, threshold: -18, ratio: 3.5, attack: 0.008, release: 0.15 },
            eq: { enabled: true, lowGain: 1, midGain: 2, highGain: 5 },
            chorus: { enabled: true, rate: 0.7, depth: 0.1, mix: 12 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 2.5, preDelay: 18, mix: 30 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },

    {
        id: 'ne-yo',
        name: 'Ne-Yo',
        category: 'r&b',
        description: 'Smooth R&B crooner, clean polished tone, warm reverb, silky highs',
        artistId: '21E3waRsmPlU7jZsS13rcj',
        effects: {
            pitchCorrection: { enabled: true, strength: 20 },
            compressor: { enabled: true, threshold: -18, ratio: 3, attack: 0.008, release: 0.15 },
            eq: { enabled: true, lowGain: 1, midGain: 3, highGain: 4 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 200, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 2.2, preDelay: 20, mix: 26 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },

    // ===== POP =====
    {
        id: 'billie-eilish',
        name: 'Billie Eilish',
        category: 'pop',
        description: 'Intimate, whispery, close reverb, delicate compression',
        artistId: '6qqNVTkY8uBg9cP3Jd7DAH',
        effects: {
            pitchCorrection: { enabled: true, strength: 10 },
            compressor: { enabled: true, threshold: -14, ratio: 2, attack: 0.02, release: 0.3 },
            eq: { enabled: true, lowGain: -3, midGain: 1, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 300, feedback: 12, mix: 6 },
            reverb: { enabled: true, decay: 1.2, preDelay: 8, mix: 18 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'lady-gaga',
        name: 'Lady Gaga',
        category: 'pop',
        description: 'Powerful pop vocal, bright EQ, polished compression, hall reverb',
        artistId: '1HY2Jd0NmPuamShAr6KMms',
        effects: {
            pitchCorrection: { enabled: true, strength: 35 },
            compressor: { enabled: true, threshold: -22, ratio: 5, attack: 0.004, release: 0.1 },
            eq: { enabled: true, lowGain: 0, midGain: 4, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 160, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 2.2, preDelay: 18, mix: 25 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },

    {
        id: 'rihanna',
        name: 'Rihanna',
        category: 'pop',
        description: 'Bold pop vocal, bright presence, punchy compression, medium reverb',
        artistId: '5pKCCKE2ajJHZ9KAiaK11H',
        effects: {
            pitchCorrection: { enabled: true, strength: 30 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.004, release: 0.1 },
            eq: { enabled: true, lowGain: 0, midGain: 3, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 180, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 2.0, preDelay: 15, mix: 24 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'dua-lipa',
        name: 'Dua Lipa',
        category: 'pop',
        description: 'Modern disco-pop, tight compression, retro chorus, bright and punchy',
        artistId: '6M2wZ9GZgrQXHCFfjv46we',
        effects: {
            pitchCorrection: { enabled: true, strength: 30 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.004, release: 0.08 },
            eq: { enabled: true, lowGain: 1, midGain: 3, highGain: 5 },
            chorus: { enabled: true, rate: 0.5, depth: 0.1, mix: 14 },
            delay: { enabled: true, time: 160, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 1.8, preDelay: 15, mix: 22 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'katy-perry',
        name: 'Katy Perry',
        category: 'pop',
        description: 'Big pop vocal, bright and wide, polished hall reverb, radio-ready',
        artistId: '6jJ0s89eD6GaHleKKya26X',
        effects: {
            pitchCorrection: { enabled: true, strength: 35 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.005, release: 0.1 },
            eq: { enabled: true, lowGain: -1, midGain: 4, highGain: 6 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 150, feedback: 12, mix: 6 },
            reverb: { enabled: true, decay: 2.2, preDelay: 18, mix: 26 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'nicki-minaj',
        name: 'Nicki Minaj',
        category: 'pop',
        description: 'Versatile pop-rap, bright presence, crisp highs, tight dynamics',
        artistId: '0hCNtLu0JehylgoiP8L4Gh',
        effects: {
            pitchCorrection: { enabled: true, strength: 25 },
            compressor: { enabled: true, threshold: -18, ratio: 5, attack: 0.003, release: 0.08 },
            eq: { enabled: true, lowGain: -1, midGain: 3, highGain: 6 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 160, feedback: 15, mix: 8 },
            reverb: { enabled: true, decay: 1.8, preDelay: 12, mix: 22 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'pitbull',
        name: 'Pitbull',
        category: 'pop',
        description: 'Party anthem vocal, big room reverb, bright and energetic, hype compression',
        artistId: '0TnOYISbd1XYRBk9myaseg',
        effects: {
            pitchCorrection: { enabled: true, strength: 20 },
            compressor: { enabled: true, threshold: -20, ratio: 5, attack: 0.003, release: 0.08 },
            eq: { enabled: true, lowGain: 1, midGain: 4, highGain: 5 },
            chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 0 },
            delay: { enabled: true, time: 140, feedback: 12, mix: 8 },
            reverb: { enabled: true, decay: 1.8, preDelay: 12, mix: 22 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },

    // ===== ROCK =====
    {
        id: 'bon-iver',
        name: 'Bon Iver',
        category: 'rock',
        description: 'Layered, ethereal, moderate autotune, lush chorus and reverb',
        artistId: '4LEiUm1SRbFMgfqnQTwUbQ',
        effects: {
            pitchCorrection: { enabled: true, strength: 60 },
            compressor: { enabled: true, threshold: -18, ratio: 3, attack: 0.01, release: 0.15 },
            eq: { enabled: true, lowGain: 1, midGain: -1, highGain: 4 },
            chorus: { enabled: true, rate: 0.5, depth: 0.22, mix: 28 },
            delay: { enabled: true, time: 480, feedback: 28, mix: 15 },
            reverb: { enabled: true, decay: 4.0, preDelay: 30, mix: 42 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'tame-impala',
        name: 'Tame Impala',
        category: 'rock',
        description: 'Psychedelic, dreamy, deep reverb, chorus, analog delay feel',
        artistId: '5INjqkS1o8h1imAzPqGZBb',
        effects: {
            pitchCorrection: { enabled: true, strength: 45 },
            compressor: { enabled: true, threshold: -20, ratio: 3.5, attack: 0.008, release: 0.15 },
            eq: { enabled: true, lowGain: -4, midGain: 0, highGain: 5 },
            chorus: { enabled: true, rate: 0.7, depth: 0.25, mix: 32 },
            delay: { enabled: true, time: 420, feedback: 30, mix: 20 },
            reverb: { enabled: true, decay: 4.5, preDelay: 25, mix: 48 },
            distortion: { enabled: true, drive: 8, mix: 6 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'the-killers',
        name: 'The Killers',
        category: 'rock',
        description: 'Anthemic rock, bright and present, arena reverb',
        artistId: '0C0XlULifJtAgn6ZNCW2eu',
        effects: {
            pitchCorrection: { enabled: true, strength: 10 },
            compressor: { enabled: true, threshold: -18, ratio: 4, attack: 0.005, release: 0.1 },
            eq: { enabled: true, lowGain: -1, midGain: 5, highGain: 4 },
            chorus: { enabled: true, rate: 0.5, depth: 0.15, mix: 15 },
            delay: { enabled: false, time: 250, feedback: 20, mix: 0 },
            reverb: { enabled: true, decay: 3.5, preDelay: 25, mix: 30 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },

    // ===== ELECTRONIC =====
    {
        id: 'daft-punk',
        name: 'Daft Punk',
        category: 'electronic',
        description: 'Vocoder-style, max pitch correction, robotic, tight compression',
        artistId: '4tZwfgrHOc3mvqYlEYSvVi',
        effects: {
            pitchCorrection: { enabled: true, strength: 100 },
            compressor: { enabled: true, threshold: -22, ratio: 10, attack: 0.001, release: 0.05 },
            eq: { enabled: true, lowGain: -5, midGain: 5, highGain: 3 },
            chorus: { enabled: true, rate: 1.8, depth: 0.3, mix: 35 },
            delay: { enabled: true, time: 130, feedback: 25, mix: 15 },
            reverb: { enabled: true, decay: 1.2, preDelay: 5, mix: 20 },
            distortion: { enabled: true, drive: 25, mix: 16 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
    {
        id: 'imogen-heap',
        name: 'Imogen Heap',
        category: 'electronic',
        description: 'Crystalline autotune, lush harmonizer feel, ethereal reverb',
        artistId: '2kGBy2WHvF0VdZyqiVCkDT',
        effects: {
            pitchCorrection: { enabled: true, strength: 80 },
            compressor: { enabled: true, threshold: -16, ratio: 2.5, attack: 0.01, release: 0.2 },
            eq: { enabled: true, lowGain: -2, midGain: 0, highGain: 5 },
            chorus: { enabled: true, rate: 0.5, depth: 0.2, mix: 30 },
            delay: { enabled: true, time: 550, feedback: 32, mix: 16 },
            reverb: { enabled: true, decay: 4.2, preDelay: 35, mix: 40 },
            distortion: { enabled: false, drive: 0, mix: 0 },
            noiseGate: { enabled: false, threshold: -50 },
        }
    },
]
