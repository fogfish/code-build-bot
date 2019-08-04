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
        description: 'build results',
        context: 'code-build-bot'
      }
    )
  }

  export function failure(repo: string, commit: string, url: string, text: string = 'build failed'): Promise<any> {
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
    }).then(x => {
      return (Buffer.from(x.data.content, 'base64')).toString('utf-8')
    })
  }

  export function issue(repo: string, title: string, details: string): Promise<any> {
    return api.issues.create({
      owner: owner(repo),
      repo: name(repo),
      title: title,
      body: details
    })
  }

  export function update(repo: string, issue: number, title: string): Promise<any> {
    return api.issues.update({
      owner: owner(repo),
      repo: name(repo),
      issue_number: issue,
      title: title
    })
  }

  export function comment(repo: string, issue: number, text: string): Promise<any> {
    return api.issues.createComment({
      owner: owner(repo),
      repo: name(repo),
      issue_number: issue,
      body: text
    })
  }

  export function close(repo: string, issue: number): Promise<any> {
    return api.issues.update({
      owner: owner(repo),
      repo: name(repo),
      issue_number: issue,
      state: 'closed'
    })
  }

}