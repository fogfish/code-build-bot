import { codebuild } from './codebuild'
import { github } from './github'

//
type Response  = {statusCode: number, body: string}
type Json      = any;
type Env       = any;
type Option<T> = undefined | T

//
//
export async function main(json: Json): Promise<Response> {
  return webhook(JSON.parse(json.body))
}

//
function env(json: Json): Option<Env> {
  switch (json.action) {
    case "opened":
      return { CI_PR: "init", CI_PR_ID: json.number, CI_COMMIT: json.pull_request.head.sha }
    case "synchronize":
      return { CI_PR: "sync", CI_PR_ID: json.number, CI_COMMIT: json.pull_request.head.sha }
    case "closed":
      return { CI_PR: "free", CI_PR_ID: json.number, CI_COMMIT: json.pull_request.head.sha }
    default:
      if (json.ref.startsWith("refs/heads/master")) {
        return { CI_COMMIT: json.after }
      }

      if (json.ref.startsWith("refs/tags/")) {
        return { CI_REL: json.ref.replace("refs/tags/", ""), CI_COMMIT: json.after }
      }

      return undefined
  }
}

//
async function build(repo: string, url: string, env: Env): Promise<Response> {
  await github.pending(repo, env.CI_COMMIT, '')

  const exists = await codebuild.exists(repo)
  if (!exists) {
    console.log("=[ create ]=> ", repo, url)
    const spec = await github.file(repo, env.CI_COMMIT, '.codebuild.json')
    const project = await codebuild.config(repo, url, JSON.parse(spec))
    console.log("=[ create ]=> success", project)
  }

  console.log("=[ code build ]=> ", repo, url)
  const result = await codebuild.run(repo, env)

  const status = codebuild.status(result.build.id)
  await github.pending(repo, env.CI_COMMIT, status)
  
  return Promise.resolve({
    statusCode: 200,
    body: JSON.stringify(result)
  })
}

//
async function webhook(json: Json): Promise<Response> {
  const config = env(json)
  console.log("==[ req ]==> ", JSON.stringify(json))
  console.log("==[ env ]==> ", JSON.stringify(config))

  if (config)
  {
    const repo   = json.repository.full_name
    const url    = json.repository.clone_url
    return build(repo, url, config)
      .catch(async e => {
        console.error("=[ failure ]=> ", e)
        await github.failure(repo, config.CI_COMMIT, '', 'invalid config')
        throw e
      })
  }

  return Promise.resolve({
    statusCode: 501,
    body: "Not Supported"
  })
}
