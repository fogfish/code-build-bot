//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as logs from '@aws-cdk/aws-logs'
import * as events from '@aws-cdk/aws-events'
import * as security from './security'
import { root, join, flat } from 'aws-cdk-pure'
import * as cloud from './cloud'
import { RestApi } from './restapi'

//
//
function CodeBuildEvents(scope: cdk.Construct): events.RuleProps {
  const target = cloud.events(cloud.lambda(Supervisor))

  return  {
    enabled: true,
    eventPattern: {
      source: ['aws.codebuild'],
      detailType: ['CodeBuild Build State Change'],
      detail: {
        'build-status': ['IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'STOPPED']
      }
    },
    targets: [target(scope)]
  }
}

//
//
function LogGroup(): logs.LogGroupProps {
  return {
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    retention: logs.RetentionDays.ONE_WEEK
  }
}

function Supervisor(parent: cdk.Construct): lambda.FunctionProps {
  const role = security.Supervisor()
  return {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'supervisor.main',
      role: role(parent),
      environment: {
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN
      }
    }
}

function CodeBuildBot(stack: cdk.Construct): cdk.Construct {
  join(stack, flat(RestApi))
  join(stack, cloud.logs(LogGroup))
  join(stack, cloud.rule(CodeBuildEvents))
  return stack
}

const app = new cdk.App()
root(app, CodeBuildBot)
app.synth()
