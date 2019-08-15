//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as type from './lib/code-build-bot'
import * as codec from './lib/codec'
import * as chat from './lib/chat'

export async function main(json: type.Json): Promise<type.Json> {
  console.log("=[ code build ]=> ", JSON.stringify(json))
  const build = codec.decodeCodeBuild(json)
  if (build) {
    try {
      console.log("=[ build ]=> ", JSON.stringify(build))
      switch (json.detail['build-status']) {
        case 'IN_PROGRESS':
          return pending(build, json)
        case 'FAILED':
        case 'STOPPED':
          return failure(build, json)
        case 'SUCCEEDED':
          return success(build, json)
      }
    } catch(reason) {
      console.error("=[ bot failure ]=> ", reason)
      await chat.sayBuildFailure(build,
        {topic: 'bot failed', text: 'check either repository or bot config'})
      throw reason
    }
  }

  return Promise.resolve({})
}

function logs(json: type.Json): string {
  const [_, id]  = json.detail['build-id'].split('/')
  return `https://console.aws.amazon.com/codebuild/home?region=${process.env.AWS_REGION}#/builds/${id}/view/new`
}

function reason(json: type.Json): string {
  const logs   = json.detail['additional-information']['phases']
  return JSON.stringify(logs, null, 2)
}

function buildspec(json: type.Json): string {
  return json.detail['additional-information']['source']['buildspec']
}

//
//
async function pending(build: type.Build, json: type.Json): Promise<type.Json> {
  await chat.sayBuildStarted(build, {topic: buildspec(json), logs: logs(json)})
  return Promise.resolve({})
}

//
//
async function failure(build: type.Build, json: type.Json): Promise<type.Json> {
  await chat.sayBuildFailure(build, {topic: buildspec(json), logs: logs(json), text: reason(json)})
  return Promise.resolve({})
}

//
//
async function success(build: type.Build, json: type.Json): Promise<type.Json> {
  await chat.sayBuildSuccess(build, {topic: buildspec(json), logs: logs(json)})
  await chat.sayBuildCompleted(build, {topic: buildspec(json)}) 
  return Promise.resolve({})
}
