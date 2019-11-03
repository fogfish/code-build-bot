//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as cdk from '@aws-cdk/core'
import * as logs from '@aws-cdk/aws-logs'
import * as pure from 'aws-cdk-pure'
import * as codebuild from './codebuild'
import * as restapi from './restapi'

//
const LogGroup = (): logs.LogGroupProps => 
  ({
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    retention: logs.RetentionDays.ONE_WEEK
  })

//
const app = new cdk.App()
const CodeBuildBot = (): cdk.StackProps => ({
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }  
})

pure.join(app,
  pure.iaac(cdk.Stack)(CodeBuildBot)
  .effect(x => {
    pure.join(x, restapi.Gateway)
    pure.join(x, pure.iaac(logs.LogGroup)(LogGroup))
    pure.join(x, codebuild.Supervisor)
  })
)
app.synth()
