//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as api from '@aws-cdk/aws-apigateway'
import * as logs from '@aws-cdk/aws-logs'
import * as events from '@aws-cdk/aws-events'
import * as security from './security'
import { IaaC, root, join, flat, use } from 'aws-cdk-pure'
import * as cloud from './cloud'

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

//
//
function WebHook(parent: cdk.Construct): lambda.FunctionProps {
  const namespace = process.env.NAMESPACE || 'code-build'
  const role = security.CodeBuildRole(parent)
  return {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'webhook.main',
      role: security.WebHookRole(parent),
      environment: {
        'CODE_BUILD_BASE': `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${namespace}`,
        'CODE_BUILD_ROLE': role.roleName,
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
        'API_KEY': process.env.API_KEY
      }
  }
}

function Supervisor(parent: cdk.Construct): lambda.FunctionProps {
  return {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'supervisor.main',
      role: security.SupervisorRole(parent),
      environment: {
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN
      }
    }
}

//
//
function Gateway(): api.RestApiProps {
  return {
    deploy: true,
    deployOptions: {
      stageName: 'api'
    },
    failOnWarnings: true,
    endpointTypes: [api.EndpointType.REGIONAL]
  }
}

//
//
function RestApi(): IaaC<api.RestApi> {
  const restapi = cloud.gateway(Gateway)
  const webhook = cloud.resource(cloud.lambda(WebHook))
  
  return use({ restapi, webhook })
    .effect(
      x => x.restapi.root.addResource('webhook').addMethod('POST', x.webhook)
    )
    .yield('restapi')
}

//
//
function CodeBuildBot(stack: cdk.Construct): cdk.Construct {
  join(stack, flat(RestApi))
  join(stack, cloud.logs(LogGroup))
  join(stack, cloud.rule(CodeBuildEvents))
  return stack
}

const app = new cdk.App()
root(app, CodeBuildBot)
app.synth()
