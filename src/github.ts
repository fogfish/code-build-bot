// import * as Octokit from '@octokit/rest'
import Octokit = require('@octokit/rest')

export namespace github {
  const api = new Octokit({
    baseUrl: 'https://api.github.com',
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'code-build-bot v1.2.3',
    log: {
      debug: console.log,
      info: console.log,
      warn: console.warn,
      error: console.error
    }
  })


  export function pending(repo: string, commit: string, url: string): Promise<any> {
    return api.repos.createStatus(
      {
        owner: repo.split('/')[0],
        repo: repo.split('/')[1],
        sha: commit,
        state: 'pending',
        target_url: url,
        description: 'building',
        context: 'code-build-bot'
      }
    )
  }

  export function failure(repo: string, commit: string, url: string): Promise<any> {
    return api.repos.createStatus(
      {
        owner: repo.split('/')[0],
        repo: repo.split('/')[1],
        sha: commit,
        state: 'failure',
        target_url: url,
        description: 'failure',
        context: 'code-build-bot'
      }
    )
  }

  export function success(repo: string, commit: string, url: string): Promise<any> {
    return api.repos.createStatus(
      {
        owner: repo.split('/')[0],
        repo: repo.split('/')[1],
        sha: commit,
        state: 'success',
        target_url: url,
        description: 'done',
        context: 'code-build-bot'
      }
    )
  }

}