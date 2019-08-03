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

  function owner(repo: string): string {
    return repo.split('/')[0]
  }

  function name(repo: string): string {
    return repo.split('/')[1]
  }

  export function pending(repo: string, commit: string, url: string): Promise<any> {
    return api.repos.createStatus(
      {
        owner: owner(repo),
        repo: name(repo),
        sha: commit,
        state: 'pending',
        target_url: url,
        description: '...',
        context: 'code-build-bot'
      }
    )
  }

  export function failure(repo: string, commit: string, url: string, text: string = 'failure'): Promise<any> {
    return api.repos.createStatus(
      {
        owner: owner(repo),
        repo: name(repo),
        sha: commit,
        state: 'failure',
        target_url: url,
        description: text,
        context: 'code-build-bot'
      }
    )
  }

  export function success(repo: string, commit: string, url: string): Promise<any> {
    return api.repos.createStatus(
      {
        owner: owner(repo),
        repo: name(repo),
        sha: commit,
        state: 'success',
        target_url: url,
        description: 'done',
        context: 'code-build-bot'
      }
    )
  }

  export function file(repo: string, commit: string, path: string): Promise<string> {
    return api.repos.getContents({
      owner: owner(repo),
      repo: name(repo),
      path: path,
      ref: commit
    }).then(x => atob(x.data.content))
  }

}