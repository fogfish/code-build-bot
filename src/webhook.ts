import { codebuild } from './codebuild'
import { github } from './github'
import * as bot from './code-build-bot'

//
type Response  = {statusCode: number, body: string}
type Json      = any;
type Option<T> = undefined | T

//
//
export async function main(json: Json): Promise<Response> {
  return webhook(JSON.parse(json.body))
}

//
async function webhook(json: Json): Promise<Response> {
  console.log("==[ webhook ]==> ", JSON.stringify(json))
  const level = levelOf(json)

  if (level) {
    const config = await env(level, json)
    return build(config)
      .then(result => (Promise.resolve({statusCode: 200, body: JSON.stringify(result)})))
      .catch(async reason => {
        console.error("=[ bot failure ]=> ", reason)
        await failure(config)
        throw reason
      })
  }

  // const config = env(json)
  // console.log("==[ env ]==> ", JSON.stringify(config))

  // if (config)
  // {
  //   const repo   = json.repository.full_name
  //   const url    = json.repository.clone_url
  //   return build(repo, url, config)
  //     .catch(async e => {
  //       console.error("=[ bot failure ]=> ", e)
  //       update_bot_issue_with_failure(repo, env)
  //       throw e
  //     })
  // }

  return Promise.resolve({
    statusCode: 501,
    body: "Not Supported"
  })
}


//
// lenses
function repoOf(json: Json): string {
  return json.repository.full_name
}

function urlOf(json: Json): string {
  return json.repository.clone_url
}

function levelOf(json: Json): bot.Level | undefined {
  switch (json.action) {
    case "opened":
      return 'init'
    case "synchronize":
      return 'sync'
    case "closed":
      return 'free'
    default:
      if (json.ref.startsWith("refs/heads/master")) {
        return 'master'
      } else if (json.ref.startsWith("refs/tags/")) {
        return 'release'
      } else {
        return undefined
      }
  }
}

function commitOf(level: bot.Level, json: Json): string {
  switch (level) {
    case 'init':
    case 'sync':
    case 'free':
      return json.pull_request.head.sha
    case 'master':
    case 'release':
      return json.after
  }  
}

function releaseOf(level: bot.Level, json: Json): string | undefined {
  switch (level) {
    case 'init':
    case 'sync':
    case 'free':
    case 'master':
      return undefined
    case 'release':
      return json.ref.replace("refs/tags/", "")
  }  
}

async function issueOf(level: bot.Level, json: Json): Promise<number> {
  switch (level) {
    case 'init':
    case 'sync':
    case 'free':
      return Promise.resolve(json.number)
    case 'master':
      return Promise.resolve(Number(json.head_commit.message.match(/#\d+/)[0].substring(1)))
    case 'release':
      return github.issue(repoOf(json), 'release ' + releaseOf(level, json), '').then(x => x.data.number)
  }
}

//
//
async function env(level: bot.Level, json: Json): Promise<bot.Env> {
  const issue = await issueOf(level, json)
  const commit = commitOf(level, json)
  const repo = repoOf(json)
  const url = urlOf(json)
  const release = releaseOf(level, json)

  return {level, repo, url, issue, commit, release}
}

// //
// function env(json: Json): Option<bot.Env> {
//   switch (json.action) {
//     case "opened":
//       return env_init(json)
//     case "synchronize":
//       return env_sync(json)
//     case "closed":
//       return env_free(json)
//     default:
//       if (json.ref.startsWith("refs/heads/master")) {
//         return env_master(json)
//       } else if (json.ref.startsWith("refs/tags/")) {
//         return env_release(json)
//       } else {
//         return undefined
//       }
//   }
// }

// function env_init(json: Json): Env {
//   return {
//     BOT_LEVEL: "init",
//     BOT_ISSUE: json.number,
//     BUILD_COMMIT: json.pull_request.head.sha
//   }
// }

// function env_sync(json: Json): Env {
//   return {
//     BOT_LEVEL: "sync",
//     BOT_ISSUE: json.number,
//     BUILD_COMMIT: json.pull_request.head.sha
//   }
// }

// function env_free(json: Json): Env {
//   return {
//     BOT_LEVEL: "free",
//     BOT_ISSUE: json.number,
//     BUILD_COMMIT: json.pull_request.head.sha
//   }
// }

// function env_master(json: Json): Env {
//   const pr = json.head_commit.message.match(/#\d+/)[0].substring(1)
//   return {
//     BOT_LEVEL: "master",
//     BOT_ISSUE: pr,
//     BUILD_COMMIT: json.after
//   }
// }

// function env_release(json: Json): Env {
//   return {
//     BOT_LEVEL: "release",
//     BUILD_REL: json.ref.replace("refs/tags/", ""),
//     BUILD_COMMIT: json.after
//   }
// }

//
//
async function build(env: bot.Env): Promise<any> {
  await pending(env)

  const exists = await codebuild.exists(env.repo)
  if (!exists) {
    console.log("=[ code build ]=> config ", env)
    const spec = await github.file(env.repo, env.commit, '.codebuild.json')
    const project = await codebuild.config(env.repo, env.url, JSON.parse(spec))
    console.log("=[ code build ]=> config success", project)
  }

  console.log("=[ code build ]=> run ", env)
  const result = await codebuild.run(env)

  const logs = codebuild.status(result.build.id)
  await pending_with_logs(env, logs)

  return result
}


async function pending(env: bot.Env): Promise<any> {
  switch (env.level) {
    case 'init':
    case 'sync':
      return github.pending(env.repo, env.commit, '')
    case 'free':
    case 'master':
    case 'release':
      return Promise.resolve(0)
  }
}

async function pending_with_logs(env: bot.Env, logs: string): Promise<any> {
  switch (env.level) {
    case 'init':
    case 'sync':
      return github.pending(env.repo, env.commit, '')
    case 'free':
      return Promise.resolve(0)    
    case 'master':
    case 'release':
      return await github.comment(env.repo, env.issue, 'build is [pending](' + logs + ')')
  }
}


async function failure(env: bot.Env): Promise<any> {
  const message = 'build aborted, check either repo or bot config'
  switch (env.level) {
    case 'init':
    case 'sync':
      return github.failure(env.repo, env.commit, '', message)
    case 'free':
      return Promise.resolve(0)    
    case 'master':
    case 'release':
      return await github.comment(env.repo, env.issue, message)
  }
}

 
//
// async function build(repo: string, url: string, env: Env): Promise<Response> {
//   env.BOT_ISSUE = await update_bot_issue(repo, env)
  
//   const exists = await codebuild.exists(repo)
//   if (!exists) {
//     console.log("=[ create ]=> ", repo, url)
//     const spec = await github.file(repo, env.BUILD_COMMIT, '.codebuild.json')
//     const project = await codebuild.config(repo, url, JSON.parse(spec))
//     console.log("=[ create ]=> success", project)
//   }

//   console.log("=[ code build ]=> ", repo, env)
//   const result = await codebuild.run(repo, env)

//   const status = codebuild.status(result.build.id)
//   update_bot_issue_with_logs(repo, env, status)

//   return Promise.resolve({
//     statusCode: 200,
//     body: JSON.stringify(result)
//   })
// }

// async function update_bot_issue(repo: string, env: Env): Promise<number> {
//   switch (env.BOT_LEVEL) {
//     case "release":
//       const issue  = await github.issue(repo, 'release ' + env.BUILD_REL, '')
//       return issue.data.number
//     case "master":
//     case "free":
//       return env.BOT_ISSUE
//     default:
//       await github.pending(repo, env.BUILD_COMMIT, '')
//       return env.BOT_ISSUE
//   }
// }

// async function update_bot_issue_with_logs(repo: string, env: Env, status: string) {
//   switch (env.BOT_LEVEL) {
//     case "release":
//       return await github.comment(repo, env.BOT_ISSUE, 'release is [pending](' + status + ')')
//     case "master":
//       return await github.comment(repo, env.BOT_ISSUE, 'deployment is [pending](' + status + ')')
//     case "free":
//       return Promise.resolve({})
//     default:
//       return await github.pending(repo, env.BUILD_COMMIT, status)
//   }
// }

// async function update_bot_issue_with_failure(repo: string, env: Env) {
//   const message = 'bot failure, check either repo or system config'
//   switch (env.BOT_LEVEL) {
//     case "release":
//       return await github.comment(repo, env.BOT_ISSUE, message)
//     case "master":
//       return await github.comment(repo, env.BOT_ISSUE, message)
//     default:
//       return await github.failure(repo, env.BUILD_COMMIT, '', message)
//   }  
// }


