//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
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
  env?: Array<string>
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
