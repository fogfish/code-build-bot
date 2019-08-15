//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
// @doc
//   TypeSafe configuration of BOT
import Octokit = require('@octokit/rest')
import * as aws from 'aws-sdk'

aws.config.update({ region: process.env.AWS_REGION })

export class Config {

  static readonly API_KEY: string = process.env.API_KEY || 'none'

  static readonly GITHUB_TOKEN: string = process.env.GITHUB_TOKEN || 'none'

  static readonly CODE_BUILD_ROLE: string = process.env.CODE_BUILD_ROLE || 'none'

  static readonly CODE_BUILD_BASE: string = process.env.CODE_BUILD_BASE || ''

  static readonly github = new Octokit({
    baseUrl: 'https://api.github.com',
    auth: Config.GITHUB_TOKEN,
    userAgent: 'code-build-bot v1.2.3',
    log: {
      debug: console.log,
      info: console.log,
      warn: console.warn,
      error: console.error
    }
  })
  
  static readonly codebuild = new aws.CodeBuild()
}
