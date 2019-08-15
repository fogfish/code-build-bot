//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
// @doc
//   chat feature for build interface
import * as type from './code-build-bot'
import { Config } from './config'

//
//
export interface Msg {
  topic: string
  text?: string
  logs?: string
}

interface Say<A> {
  say(build: A, msg: Msg): Promise<type.WebHook>
}

//
//
namespace BuildPending {}
type BuildPending = keyof typeof BuildPending

export function sayBuildPending<T extends BuildPending>(build: type.Cat<T>, msg: Msg): Promise<type.WebHook> {
  return (<any>BuildPending[build.constructor.name as BuildPending]).say(build, msg)
}

//
//
namespace BuildStarted {}
type BuildStarted = keyof typeof BuildStarted

export function sayBuildStarted<T extends BuildStarted>(build: type.Cat<T>, msg: Msg): Promise<type.WebHook> {
  return (<any>BuildStarted[build.constructor.name as BuildStarted]).say(build, msg)
}

//
//
namespace BuildFailure {}
type BuildFailure = keyof typeof BuildFailure

export function sayBuildFailure<T extends BuildFailure>(build: type.Cat<T>, msg: Msg): Promise<type.WebHook> {
  return (<any>BuildFailure[build.constructor.name as BuildFailure]).say(build, msg)
}

//
//
namespace BuildSuccess {}
type BuildSuccess = keyof typeof BuildSuccess

export function sayBuildSuccess<T extends BuildSuccess>(build: type.Cat<T>, msg: Msg): Promise<type.WebHook> {
  return (<any>BuildSuccess[build.constructor.name as BuildSuccess]).say(build, msg)
}

//
//
namespace BuildCompleted {}
type BuildCompleted = keyof typeof BuildCompleted

export function sayBuildCompleted<T extends BuildCompleted>(build: type.Cat<T>, msg: Msg): Promise<type.WebHook> {
  return (<any>BuildCompleted[build.constructor.name as BuildCompleted]).say(build, msg)
}


//
//
class None implements Say<type.Build> {
  async say(build: type.Build, msg: Msg): Promise<type.WebHook> {
    return Promise.resolve(build.webhook)
  }
}

//
//
class IssueCreate implements Say<type.Build> {
  async say(build: type.Build, msg: Msg): Promise<type.WebHook> {
    const [owner, repo] = build.webhook.base.repository.split('/')
    const title = `${msg.topic} ${build.webhook.release}`
    const body  = msg.text || ''

    return Config.github.issues
      .create({owner, repo, title, body})
      .then(json => {
        const number = json.data.number
        const issue  = <type.Issue>{number, title}
        return { ...build.webhook, issue }
      })
  }
}

class IssueClose implements Say<type.Build> {
  async say(build: type.Build, msg: Msg): Promise<type.WebHook> {
    const [owner, repo] = build.webhook.base.repository.split('/')
    const issue_number = build.webhook.issue.number
    const state = 'closed'

    return Config.github.issues
      .update({owner, repo, issue_number, state})
      .then(_ => build.webhook)
  }
}

class BugReport implements Say<type.Build> {
  prefix: string
  constructor(prefix: string) {this.prefix = prefix}

  async say(build: type.Build, msg: Msg): Promise<type.WebHook> {
    const [owner, repo] = build.webhook.base.repository.split('/')
    const number = build.webhook.issue.number
    const title = `${this.prefix} of PR ${number} is failed.`
    const body = `Caused by **Pull Request** #${number}, See [build logs](${msg.logs})

\`\`\`javascript
${msg.text}
\`\`\`
`

    return Config.github.issues
      .create({owner, repo, title, body})
      .then(_ => build.webhook)
  }
}

//
type State = 'pending' | 'success' | 'failure'

//
//
class Comment implements Say<type.Build> {
  state: State
  constructor(state: State) {this.state = state}

  async say(build: type.Build, msg: Msg): Promise<type.WebHook> {
    const [owner, repo] = build.webhook.base.repository.split('/')
    const issue_number = build.webhook.issue.number
    const body = !msg.text
      ? `${msg.topic} [${this.state}](${msg.logs})`
      : `${msg.topic} [${this.state}](${msg.logs})
\`\`\`javascript
${msg.text}
\`\`\`
`
    return Config.github.issues
      .createComment({owner, repo, issue_number, body})
      .then(_ => build.webhook)
  }
}

//
//
class Commit implements Say<type.Build> {
  state: State
  constructor(state: State) {this.state = state}

  async say(build: type.Build, msg: Msg): Promise<type.WebHook> {
    const [owner, repo] = build.webhook.head.repository.split('/')
    const sha = build.webhook.head.commit
    const state = this.state
    const target_url = msg.logs || ''
    const description = msg.topic
    const context =  'code-build-bot'

    return Config.github.repos
      .createStatus({owner, repo, sha, state, target_url, description, context})
      .then(_ => build.webhook)
  }
}

//
declare module './code-build-bot' {
  interface Cats {
    PullRequestBuild: type.PullRequestBuild
    PullRequestClean: type.PullRequestClean
    MasterBuild: type.MasterBuild
    ReleaseBuild: type.ReleaseBuild
  }
}

namespace BuildPending {
  export const PullRequestBuild = new Commit('pending')
  export const PullRequestClean = new None
  export const MasterBuild = new None
  export const ReleaseBuild = new IssueCreate
}

namespace BuildStarted {
  export const PullRequestBuild = new Commit('pending')
  export const PullRequestClean = new None
  export const MasterBuild = new Comment('pending')
  export const ReleaseBuild = new Comment('pending')
}

namespace BuildFailure {
  export const PullRequestBuild = new Commit('failure')
  export const PullRequestClean = new BugReport('Clean Up')
  export const MasterBuild = new BugReport('Build')
  export const ReleaseBuild = new Comment('failure')
}

namespace BuildSuccess {
  export const PullRequestBuild = new Commit('success')
  export const PullRequestClean = new None
  export const MasterBuild = new Comment('success')
  export const ReleaseBuild = new Comment('success')
}

namespace BuildCompleted {
  export const PullRequestBuild = new None
  export const PullRequestClean = new None
  export const MasterBuild = new None
  export const ReleaseBuild = new IssueClose
}
