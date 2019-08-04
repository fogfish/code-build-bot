import { codebuild } from './lib/codebuild'
import { github } from './lib/github'
import * as bot from './lib/code-build-bot'
import { message } from './lib/text'

//
type Response  = {statusCode: number, body: string}
type Json      = any;

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
      return github.issue(repoOf(json), message.release(releaseOf(level, json)), message.empty).then(x => x.data.number)
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
      return await github.comment(env.repo, env.issue, message.pending(logs))
  }
}

async function failure(env: bot.Env): Promise<any> {
  switch (env.level) {
    case 'init':
    case 'sync':
      return github.failure(env.repo, env.commit, message.empty, message.aborted)
    case 'free':
      return Promise.resolve(0)    
    case 'master':
    case 'release':
      return await github.comment(env.repo, env.issue, message.aborted)
  }
}
