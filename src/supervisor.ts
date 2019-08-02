import { codebuild } from './codebuild'
import { github } from './github'

type Json     = any;

export async function main(json: Json): Promise<Json> {
  console.log("=[ code build ]=> ", JSON.stringify(json))

  const status = json.detail['build-status']
  const build  = json.detail['build-id']
  const repo   = json.detail['project-name'].replace('-', '/')
  const commit = json.detail['additional-information']['source-version']
  const url    = codebuild.status(build)

  switch (status) {
    case 'IN_PROGRESS':
      return github.pending(repo, commit, url)
    case 'FAILED':
    case 'STOPPED':
      return github.failure(repo, commit, url)
    case 'SUCCEEDED':
      return github.success(repo, commit, url)
  }

  return Promise.resolve('ok')
}
