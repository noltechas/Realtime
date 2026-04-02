/**
 * Stem Cache - Manages locally cached separated stems
 *
 * Saves stems per trackId in ~/.realtime-karaoke/stems/{trackId}/
 * Checks cache before re-processing to avoid redundant API calls.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CACHE_DIR = path.join(os.homedir(), '.realtime-karaoke', 'stems')

export const stemCache = {
    getStemDir(trackId: string): string {
        return path.join(CACHE_DIR, trackId)
    },

    hasCachedStems(trackId: string): boolean {
        const dir = this.getStemDir(trackId)
        if (!fs.existsSync(dir)) return false

        const required = ['lead.wav', 'backing.wav', 'instrumental.wav']
        return required.every(f => fs.existsSync(path.join(dir, f)))
    },

    getCachedPaths(trackId: string) {
        const dir = this.getStemDir(trackId)
        return {
            lead: path.join(dir, 'lead.wav'),
            backing: path.join(dir, 'backing.wav'),
            instrumental: path.join(dir, 'instrumental.wav')
        }
    },

    clearCache(trackId?: string) {
        if (trackId) {
            const dir = this.getStemDir(trackId)
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true })
            }
        } else {
            // Clear all
            if (fs.existsSync(CACHE_DIR)) {
                fs.rmSync(CACHE_DIR, { recursive: true })
            }
        }
    },

    getCacheSize(): number {
        if (!fs.existsSync(CACHE_DIR)) return 0
        let totalSize = 0
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                    walk(fullPath)
                } else {
                    totalSize += fs.statSync(fullPath).size
                }
            }
        }
        walk(CACHE_DIR)
        return totalSize
    },

    getCachedTracks(): string[] {
        if (!fs.existsSync(CACHE_DIR)) return []
        return fs.readdirSync(CACHE_DIR, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
    }
}
