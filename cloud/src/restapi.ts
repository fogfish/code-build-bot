//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as cdk from '@aws-cdk/core'
import * as api from '@aws-cdk/aws-apigateway'
import * as lambda from '@aws-cdk/aws-lambda'
import * as security from './security'
import { IaaC, use } from 'aws-cdk-pure'
import * as cloud from './cloud'


export function RestApi(): IaaC<api.RestApi> {
  const restapi = cloud.gateway(Gateway)
  const webhook = cloud.resource(cloud.lambda(WebHook))
  
  return use({ restapi, webhook })
    .effect(
      x => x.restapi.root.addResource('webhook').addMethod('POST', x.webhook)
    )
    .yield('restapi')
}

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
function WebHook(parent: cdk.Construct): lambda.FunctionProps {
  const namespace = process.env.NAMESPACE || 'code-build'
  const role = security.WebHook()
  const codebuild = security.CodeBuild()
  return {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'webhook.main',
      role: role(parent),
      environment: {
        'CODE_BUILD_BASE': `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${namespace}`,
        'CODE_BUILD_ROLE': codebuild(parent).roleName,
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
        'API_KEY': process.env.API_KEY
      }
  }
}