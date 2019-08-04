import { codebuild } from './codebuild'
import { github } from './github'
import * as bot from './code-build-bot'
import { message } from './text'

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
      return github.issue(repo(json), message.failureFree(cfg.BUILD_ISSUE), causedBy(cfg.BUILD_ISSUE, json))
    case 'master':
      return github.issue(repo(json), message.failureBuild(at(json)), causedBy(cfg.BUILD_ISSUE, json))
    case 'release':
      await github.update(repo(json), Number(cfg.BUILD_ISSUE), message.failureRelease(cfg.BUILD_RELEASE, at(json)))
      return github.comment(repo(json), Number(cfg.BUILD_ISSUE), reasonOf(json))
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
      return github.comment(repo(json), Number(cfg.BUILD_ISSUE), message.success(logs(json)))
    case 'release':
      await github.comment(repo(json), Number(cfg.BUILD_ISSUE), message.success(logs(json)))
      return github.close(repo(json), Number(cfg.BUILD_ISSUE))
  }
}

function causedBy(pr: string, json: Json): string {
  const build  = json.detail['build-id']
  const url    = codebuild.status(build)
  const logs   = json.detail['additional-information']['phases']
  return message.failureCausedBy(pr, url, JSON.stringify(logs, null, 2))
}

function reasonOf(json: Json): string {
  const build  = json.detail['build-id']
  const url    = codebuild.status(build)
  const logs   = json.detail['additional-information']['phases']

  return message.failure(url, JSON.stringify(logs, null, 2))
}

