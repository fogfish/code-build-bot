//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import { codebuild } from './lib/codebuild'
import * as type from './lib/code-build-bot'
import * as crypto from 'crypto'
import { Config } from './lib/config'
import * as codec from './lib/codec'
import * as chat from './lib/chat'

//
type Response  = {statusCode: number, body: string}

//
//
export async function main(json: type.Json): Promise<Response> {
  if (auth(json)) {
    const hook = codec.decodeGitHub(JSON.parse(json.body))
    return hook
      ? webhook(hook) 
      : Promise.resolve({statusCode: 501, body: 'Not Supported'})
  }
  return Promise.resolve({statusCode: 403, body: 'Forbidden'})
}

function auth(json: type.Json): boolean {
  const hmac = crypto.createHmac('sha1', Config.API_KEY)
  hmac.update(json.body)
  const sign = "sha1=" + hmac.digest('hex')
  return sign === json.headers['X-Hub-Signature']
}

//
async function webhook(build: type.Build): Promise<Response> {
  console.log("==[ build ]==> ", JSON.stringify(build))
  try {
    let url: string = 'undefined'
    build.webhook = await chat.sayBuildPending(build, {topic: 'build'})
    await codebuild.config(build)

    if (build.type === 'Release') {
      url = await codebuild.carry(build)
    } else if (build.type === 'CleanUp') {
      url = await codebuild.clean(build)
    } else if (build.type === 'Master') {
      url = await codebuild.build(build)
    } else {
      const spec = await codebuild.file(build, '.codebuild.json')
      if (spec.approver && spec.approver.indexOf(build.webhook.head.developer) !== -1) {
        url = await codebuild.build(build)
      } else {
        url = await codebuild.check(build)
      }
    }

    if (url === 'undefined') {
      await chat.sayBuildSuccess(build, {topic: 'build skipped'})
    }

    return Promise.resolve({statusCode: 200, body: JSON.stringify(build.webhook)})
  } catch (reason) {
    console.error("=[ bot failure ]=> ", reason)
    await chat.sayBuildFailure(build,
      {topic: 'bot failed', text: 'check either repository or bot config'})
    throw reason
  }
}
