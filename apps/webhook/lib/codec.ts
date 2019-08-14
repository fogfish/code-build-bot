//
// @doc
//   codecs for webhook events
import * as type from './code-build-bot'

export function decodeGitHub(json: type.Json): type.Build | undefined {
  if (json.action && json.action === 'opened') {
    return new type.PullRequestBuild(decodeWebHook(json))
  } else if (json.action && json.action === 'synchronize') {
    return new type.PullRequestBuild(decodeWebHook(json))
  } else if (json.action && json.action === 'closed') {
    return new type.PullRequestClean(decodeWebHook(json))
  } else if (json.ref.startsWith('refs/heads/master')) {
    return new type.MasterBuild(decodeWebHook(json))
  } else if (json.ref.startsWith('refs/tags/')) {
    return new type.ReleaseBuild(decodeWebHook(json))
  }
  return undefined
}

export function decodeCodeBuild(json: type.Json): type.Build | undefined {
  const env = json.detail['additional-information']['environment']['environment-variables']
    .reduce((acc: any, x: any) => ({...acc, [x.name]: x.value}), {})
  const webhook = <type.WebHook>JSON.parse(env.WEBHOOK)

  switch (env.BUILD) {
    case 'PullRequest':
      return new type.PullRequestBuild(webhook)
    case 'CleanUp':
      return new type.PullRequestClean(webhook)
    case 'Master':
      return new type.MasterBuild(webhook)
    case 'Release':
      return new type.ReleaseBuild(webhook)
  }
  return undefined
}

//
//
function decodeWebHook(json: type.Json): type.WebHook {
  const issue = decodeIssue(json)
  const head  = decodeHead(json)
  const base  = decodeBase(json)
  const release = decodeRelease(json)
  const url = json.repository.clone_url

  return { issue, head, base, release, url }
}

function decodeRelease(json: type.Json): string {
  if ('pull_request' in json) {
    return `pr${json.pull_request.number}`
  } else if (json.ref.startsWith('refs/tags/')) {
    return json.ref.replace('refs/tags/', '')
  } else {
    return 'latest'
  }
}

function decodeIssue(json: type.Json): type.Issue {
  const number = 'pull_request' in json 
    ? Number(json.pull_request.number)
    : Number(json.head_commit.message.match(/#\d+/)[0].substring(1))

  const title  = 'pull_request' in json
    ? json.pull_request.title 
    : json.head_commit.message

  const branch = 'pull_request' in json 
    ? json.pull_request.head.label 
    : json.ref   // Note: refs/tags/1.0.1 | refs/heads/master

  return { number, title, branch }
}

function decodeHead(json: type.Json): type.Commit {
  const developer = 'pull_request' in json 
    ? json.pull_request.head.user.login 
    : json.head_commit.author.username

  const repository = 'pull_request' in json 
    ? json.pull_request.head.repo.full_name 
    : json.repository.full_name

  const branch = 'pull_request' in json
    ? json.pull_request.head.ref
    : json.ref   // Note: refs/tags/1.0.1 | refs/heads/master

  const commit = 'pull_request' in json
    ? json.pull_request.head.sha
    : json.after

  return { developer, repository, branch, commit }
}

function decodeBase(json: type.Json): type.Commit {
  const developer ='pull_request' in json 
    ? json.pull_request.base.user.login
    : json.repository.owner.login

  const repository = json.repository.full_name

  const branch = 'pull_request' in json
  ? json.pull_request.base.ref
  : json.base_ref   // Note: refs/heads/master

  const commit = 'pull_request' in json
  ? json.pull_request.base.sha
  : json.before

  return { developer, repository, branch, commit }
}
