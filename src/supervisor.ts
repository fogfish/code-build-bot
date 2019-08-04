import { codebuild } from './codebuild'
import { github } from './github'
import * as bot from './code-build-bot'

type Json     = any;
type CodeBuildStatus = 'IN_PROGRESS' | 'FAILED' | 'STOPPED' | 'SUCCEEDED'

function status(json: Json): CodeBuildStatus {
  return <CodeBuildStatus>json.detail['build-status']
}

function config(json: Json): any {
  return json.detail['additional-information']['environment']['environment-variables']
    .reduce((acc: any, x: any) => ({...acc, [x.name]: x.value}), {})
}

function levelOf(json: Json): bot.Level {
  const cfg = config(json) 
  return <bot.Level>cfg.BUILD_LEVEL
}

function repo(json: Json): string {
  return json.detail['project-name'].replace('-', '/')
}

function commit(json: Json): string {
  return json.detail['additional-information']['source-version']
}

function at(json: Json): string {
  return json.detail['additional-information']['build-start-time']
}

function logs(json: Json): string {
  const id  = json.detail['build-id']
  return codebuild.status(id)
}

export async function main(json: Json): Promise<Json> {
  console.log("=[ code build ]=> ", JSON.stringify(json))
  switch (status(json)) {
    case 'IN_PROGRESS':
      return pending(levelOf(json), json)
    case 'FAILED':
    case 'STOPPED':
      return failure(levelOf(json), json)
    case 'SUCCEEDED':
      return success(levelOf(json), json)
  }
}

async function pending(level: bot.Level, json: Json): Promise<any> {
  switch (level) {
    case 'init':
    case 'sync':
      return github.pending(repo(json), commit(json), logs(json))
    case 'free':
    case 'master':
    case 'release':
      return Promise.resolve(1)
  }
}

async function failure(level: bot.Level, json: Json) {
  const cfg = config(json)
  switch (level) {
    case 'init':
    case 'sync':
      return github.failure(repo(json), commit(json), logs(json))
    case 'free':
      return github.issue(repo(json), "Clean up of PR " + cfg.BUILD_ISSUE + " is failed.", 'Caused by **Pull Request** #' + cfg.BUILD_ISSUE + ', ' + reason(json))
    case 'master':
      return github.issue(repo(json), "Build " + at(json) + " is failed.", 'Caused by **Pull Request** #' + cfg.BUILD_ISSUE + ', ' + reason(json))
    case 'release':
      await github.update(repo(json), Number(cfg.BUILD_ISSUE), "Release " + cfg.BUILD_RELEASE + " " + at(json) + " is failed.")
      return github.comment(repo(json), Number(cfg.BUILD_ISSUE), reason(json))
  }  
}
          
async function success(level: bot.Level, json: Json) {
  const cfg = config(json)
  switch (level) {
    case 'init':
    case 'sync':
      return github.success(repo(json), commit(json), logs(json))
    case 'free':
      return Promise.resolve(1)
    case 'master':
      return github.comment(repo(json), Number(cfg.BUILD_ISSUE), 'build is [completed](' + logs(json) + ')')
    case 'release':
      await github.comment(repo(json), Number(cfg.BUILD_ISSUE), 'build is [completed](' + logs(json) + ')')
      return github.close(repo(json), Number(cfg.BUILD_ISSUE))
  }
}

function reason(json: Json): string {
  const build  = json.detail['build-id']
  const url    = codebuild.status(build)
  const logs   = json.detail['additional-information']['phases']

  return 'See [build logs](' + url + ')\n\n```javascript\n\n' + JSON.stringify(logs, null, 2) + '\n\n```'
}
