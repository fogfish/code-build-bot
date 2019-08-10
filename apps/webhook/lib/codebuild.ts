import * as aws from 'aws-sdk'
import * as bot from './code-build-bot'

export namespace codebuild {
  aws.config.update({ region: process.env.AWS_REGION })
  const api = new aws.CodeBuild()

  function nameCodeBuild(repo: string): string {
    return repo.replace('/', '-')
  }

  //
  export function status(id: string): string {
    const build = id.split('/')[1] || id
    return "https://console.aws.amazon.com/codebuild/home?region=" + process.env.AWS_REGION + "#/builds/" + build + "/view/new"
  }

  //
  export function exists(repo: string): Promise<boolean> {
    const name = nameCodeBuild(repo)
    return api.batchGetProjects({names: [name]})
      .promise()
      .then(x => (!x.projectsNotFound || x.projectsNotFound.indexOf(name) === -1) )
  }

  //
  export function config(repo: string, url: string, spec: {image: string}): Promise<any> {
    const name = nameCodeBuild(repo)
    return api.createProject({
      name: name,
      source: {
        type: "GITHUB",
        location: url
      },
      artifacts: {
        type: "NO_ARTIFACTS"
      },
      environment: {
        type: "LINUX_CONTAINER",
        image: code_build_image(spec.image),
        computeType: "BUILD_GENERAL1_SMALL",
        privilegedMode: true
      },
      serviceRole: process.env.CODE_BUILD_ROLE,
      logsConfig: {
        s3Logs: {status: "DISABLED"},
        cloudWatchLogs: {
          status: "ENABLED",
          groupName: '/aws/codebuild/bot',
          streamName: name
        }
      }
    }).promise()
  }

  function code_build_image(image: string): string {
    return image.match('/')
      ? process.env.CODE_BUILD_BASE.split('/')[0] + '/' + image 
      : process.env.CODE_BUILD_BASE + '/' + image
  }

  //
  export function run(env: bot.Env): Promise<any> {
    const name = nameCodeBuild(env.repo)
    const vars = [
      {name: "BUILD_LEVEL", value: String(env.level)},
      {name: "BUILD_ISSUE", value: String(env.issue)},
      {name: "BUILD_COMMIT", value: String(env.commit)},
      {name: "BUILD_RELEASE", value: String(env.release)}
    ]
    return api.startBuild({
      projectName: name,
      artifactsOverride: { type: 'NO_ARTIFACTS' },
      sourceVersion: env.commit,
      environmentVariablesOverride: vars,
      buildspecOverride: 'buildspec.yml'
    }).promise()
  }

}