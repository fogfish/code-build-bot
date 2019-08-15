//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as type from './code-build-bot'
import { Config } from './config'

export namespace codebuild {

  export async function config(build: type.Build): Promise<type.WebHook> {
    const has = await exists(build)
    if (!has) {
      console.log("=[ code build ]=> config ", build.webhook.base.repository)
      const spec = await file(build, '.codebuild.json')
      await create(build, spec)
      console.log("=[ code build ]=> config success", codebuild)
    }
    return build.webhook
  }

  async function exists(build: type.Build): Promise<boolean> {
    const name = nameCodeBuild(build.webhook.base.repository)
    return Config.codebuild
      .batchGetProjects({names: [name]})
      .promise()
      .then(x => (!x.projectsNotFound || x.projectsNotFound.indexOf(name) === -1) )
  }

  export async function file(build: type.Build, path: string): Promise<type.CodeBuildSpec> {
    const [owner, repo] = build.webhook.head.repository.split('/')
    const ref = build.webhook.head.commit

    return Config.github.repos
      .getContents({owner, repo, path, ref})
      .then(x => {
        const data = (Buffer.from(x.data.content, 'base64')).toString('utf-8')
        return <type.CodeBuildSpec>JSON.parse(data)
      })
  }

  //
  async function create(build: type.Build, spec: type.CodeBuildSpec): Promise<type.Json> {
    const name = nameCodeBuild(build.webhook.base.repository)
    return Config.codebuild.createProject({
      name: name,
      source: {
        type: "GITHUB",
        location: build.webhook.url
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
      serviceRole: Config.CODE_BUILD_ROLE,
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

  function nameCodeBuild(repo: string): string {
    return repo.replace('/', '-')
  }

  function code_build_image(image: string): string {
    return image.match('/')
      ? Config.CODE_BUILD_BASE.split('/')[0] + '/' + image 
      : Config.CODE_BUILD_BASE + '/' + image
  }

  //
  export async function check(build: type.Build): Promise<type.URL> {
    return run(build, 'checkspec.yml')
  }

  export async function build(build: type.Build): Promise<type.URL | undefined> {
    return run(build, 'buildspec.yml')
  }

  async function run(build: type.Build, buildspec: string): Promise<type.URL> {
    const name = nameCodeBuild(build.webhook.base.repository)
    const vars = [
      {name: 'WEBHOOK', value: JSON.stringify(build.webhook)},
      {name: 'BUILD', value: build.type},
      {name: "BUILD_ISSUE", value: String(build.webhook.issue.number)},
      {name: "BUILD_COMMIT", value: build.webhook.head.commit},
      {name: "BUILD_RELEASE", value: build.webhook.release}
    ]
    return Config.codebuild.startBuild({
        projectName: name,
        artifactsOverride: { type: 'NO_ARTIFACTS' },
        sourceVersion: build.webhook.head.commit,
        environmentVariablesOverride: vars,
        buildspecOverride: buildspec
      })
      .promise()
      .then(x => (
        `https://console.aws.amazon.com/codebuild/home?region=${process.env.AWS_REGION}#/builds/${x.build.id}/view/new`
      ))
  }



}
