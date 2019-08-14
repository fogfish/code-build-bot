// @doc
//   type system of code build bot

//
export type Json = any
export type URL  = string

//
//
export interface Cats {}

export type Cat<T extends keyof Cats> = Cats[T]

//
//
type SHA = string

export interface Commit {
  developer: string
  repository: string
  branch: string
  commit: SHA
}

export interface Issue {
  number: number
  title: string
  branch: string
}

export interface WebHook {
  issue: Issue
  head: Commit
  base: Commit
  release: string
  url: string
}

export interface CodeBuildSpec {
  image: string
  approver: Array<string>
}

//
//
export class Build {
  type: string 
  webhook: WebHook

  constructor(webhook: WebHook) {this.webhook = webhook}
}

export class PullRequestBuild extends Build {
  type = 'PullRequest'
  constructor(webhook: WebHook) {super(webhook)}
}

export class PullRequestClean extends Build {
  type = 'CleanUp'
  constructor(webhook: WebHook) {super(webhook)}
}

export class MasterBuild extends Build {
  type = 'Master'
  constructor(webhook: WebHook) {super(webhook)}
}

export class ReleaseBuild extends Build {
  type = 'Release'
  constructor(webhook: WebHook) {super(webhook)}
}






//
//
// repo full_name
// repo url
// 

// export interface EventWebHook {
//   repository: Repository
// }

// export interface EventPullRequest extends EventWebHook {
//   action: 'opened' | 'synchronize' | 'closed'
//   pr: PullRequest
// }

// export interface EventPush extends EventWebHook {
//   after: SHA
//   ref: string
// }

// export interface EventMaster extends EventPush {}

// export interface EventRelease extends EventPush {}


// export interface Repository {
//   full_name: string
//   clone_url: string
// }

// export interface PullRequest {
//   head: Commit
// }


export type Level = 'init' | 'sync' | 'free' | 'master' | 'release'

export interface Env {
  level: Level
  repo: string
  url: string
  issue: number
  commit: string
  release: string | undefined
}

