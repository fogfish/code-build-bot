//
// type system of code build bot

export type Level = 'init' | 'sync' | 'free' | 'master' | 'release'

export interface Env {
  level: Level
  repo: string
  url: string
  issue: number
  commit: string
  release: string | undefined
}

