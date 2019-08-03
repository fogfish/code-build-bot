import { codebuild } from './codebuild'
import { github } from './github'
import * as bot from './code-build-bot'

type Json     = any;
type CodeBuildStatus = 'IN_PROGRESS' | 'FAILED' | 'STOPPED' | 'SUCCEEDED'

function status(json: Json): CodeBuildStatus {
  return <CodeBuildStatus>json.detail['build-status']
}

function config(json: Json): any {
  json.detail['additional-information']['environment']['environment-variables']
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
      return github.issue(repo(json), "Clean up of PR " + cfg.BUILD_ISSUE + " is failed.", '#' + cfg.BUILD_ISSUE + ', ' + reason(json))
    case 'master':
      return github.issue(repo(json), "Build " + at(json) + " is failed.", reason(json))
    case 'release':
      await github.update(repo(json), Number(cfg.BUILD_ISSUE), "Build " + at(json) + " is failed.")
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


// export async function main(json: Json): Promise<Json> {
//   // TODO: raise an issue if free stage is failed.
//   console.log("=[ code build ]=> ", JSON.stringify(json))

//   const status = json.detail['build-status']
//   const build  = json.detail['build-id']
//   const repo   = json.detail['project-name'].replace('-', '/')
//   const commit = json.detail['additional-information']['source-version']
//   const env    = json.detail['additional-information']['environment']['environment-variables']
//     .reduce((acc: any, x: any) => ({...acc, [x.name]: x.value}), {})
//   const url    = codebuild.status(build)
//   const time   = json.detail['additional-information']['build-start-time']

//   switch (status) {
//     case 'IN_PROGRESS':
//       switch (env.BOT_LEVEL) {
//         case "master":
//         case "free":
//         case "release":
//           return Promise.resolve({})
//         default:
//           return github.pending(repo, commit, url)
//       }
//     case 'FAILED':
//     case 'STOPPED':
//       switch (env.BOT_LEVEL) {
//         case "master":
//           return github.issue(repo, "Build " + time + " is failed.", reason(json))
//         case "release":
//           await github.update(repo, Number(env.BOT_ISSUE), "Build " + time + " is failed.")
//           return github.comment(repo, Number(env.BOT_ISSUE), reason(json))
//         case "free":
//           return github.issue(repo, "Clean up of PR " + env.BOT_ISSUE + " is failed.", '#' + env.BOT_ISSUE + ', ' + reason(json))
//         default:
//           return github.failure(repo, commit, url)
//       }
//     case 'SUCCEEDED':
//       switch (env.BOT_LEVEL) {
//         case "master":
//           return github.comment(repo, Number(env.BOT_ISSUE), 'build is [completed](' + url + ')')
//         case "release":
//           await github.comment(repo, Number(env.BOT_ISSUE), 'build is [completed](' + url + ')')
//           return github.close(repo, Number(env.BOT_ISSUE))
//         case "free":
//           return Promise.resolve({})
//         default:
//           return github.success(repo, commit, url)
//       }      
//   }

//   return Promise.resolve('ok')
// }

function reason(json: Json): string {
  const build  = json.detail['build-id']
  const url    = codebuild.status(build)
  const logs   = json.detail['additional-information']['phases']

  return '[Build logs](' + url + ')\n\n```javascript\n\n' + JSON.stringify(logs, null, 2) + '\n\n```'
}
