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
    build.webhook = await chat.sayBuildPending(build, {topic: 'build'})
    await codebuild.config(build)

    if (build.type === 'Release') {
      await codebuild.spec(build, 'carryspec.yml')
        .then(x => x 
          ? codebuild.carry(build)
          : Promise.resolve('undefined')
        )
    } else if (build.type === 'CleanUp') {
      await codebuild.spec(build, 'cleanspec.yml')
        .then(x => x 
          ? codebuild.clean(build)
          : Promise.resolve('undefined')
        )
    } else if (build.type === 'Master') {
      await codebuild.spec(build, 'buildspec.yml')
        .then(x => x 
          ? codebuild.build(build)
          : Promise.resolve('undefined')
        )
    } else {
      const spec = await codebuild.file(build, '.codebuild.json')
      if (spec.approver && spec.approver.indexOf(build.webhook.head.developer) !== -1) {
        await codebuild.build(build)
      } else {
        await codebuild.check(build)
      }
    }

    return Promise.resolve({statusCode: 200, body: JSON.stringify(build.webhook)})
  } catch (reason) {
    console.error("=[ bot failure ]=> ", reason)
    await chat.sayBuildFailure(build,
      {topic: 'bot failed', text: 'check either repository or bot config'})
    throw reason
  }
}
