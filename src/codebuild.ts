import * as aws from 'aws-sdk'

export namespace codebuild {
  aws.config.update({ region: process.env.AWS_REGION })
  const api = new aws.CodeBuild()

  function nameCodeBuild(repo: string): string {
    return repo.replace('/', '-')
  }

  //
  export function status(id: string): string {
    return "https://console.aws.amazon.com/codebuild/home?region=" + process.env.AWS_REGION + "#/builds/" + id + "/view/new"
  }

  //
  export function exists(repo: string): Promise<boolean> {
    const name = nameCodeBuild(repo)
    return api.batchGetProjects({names: [name]})
      .promise()
      .then(x => (!x.projectsNotFound || x.projectsNotFound.indexOf(name) === -1) )
  }

  //
  export function config(repo: string, url: string): Promise<any> {
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
        image: "189549315145.dkr.ecr.eu-west-1.amazonaws.com/silvere/code-build-erlang",
        computeType: "BUILD_GENERAL1_SMALL",
        privilegedMode: true
      },
      serviceRole: process.env.ROLE_CODE_BUILD,
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

  //
  export function run(repo: string, config: any): Promise<any> {
    const name = nameCodeBuild(repo)
    const env  = Object.keys(config).map(key => ({name: key, value: config[key].toString()}))
    return api.startBuild({
      projectName: name,
      artifactsOverride: { type: 'NO_ARTIFACTS' },
      sourceVersion: config.CI_COMMIT,
      environmentVariablesOverride: env,
      buildspecOverride: 'buildspec.yml'
    }).promise()
  }

}