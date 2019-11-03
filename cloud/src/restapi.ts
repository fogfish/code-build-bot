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
import * as iam from '@aws-cdk/aws-iam'
import * as pure from 'aws-cdk-pure'
import { gateway } from 'aws-cdk-pure-hoc'
import * as codebuild from './codebuild'

export const Gateway = (): pure.IPure<api.RestApi> => 
  pure.use({
    restapi: gateway.Api({ subdomain: 'ci', domain: process.env.CI_DOMAIN || 'example.com' }),
    webhook: WebHook(),
  }).effect(
    x => x.restapi.root.addResource('webhook').addMethod('POST', x.webhook)
  ).yield('restapi')

//
//
/*
const RestApi = (): pure.IPure<api.RestApi> => {
  const iaac = pure.iaac(api.RestApi)
  const CodeBuildApi = (): api.RestApiProps => 
    ({
      deploy: true,
      deployOptions: {
        stageName: 'api'
      },
      failOnWarnings: true,
      endpointTypes: [api.EndpointType.REGIONAL]
    })
  return iaac(CodeBuildApi)
}
*/

//
//
const WebHook = (): pure.IPure<api.LambdaIntegration> =>
  pure.use({
    roleLambda: Role(),
    roleCodeBuild: codebuild.Role()
  }).flatMap(
    x => ({ lambda: CodeBuildHook(x.roleLambda, x.roleCodeBuild) })
  ).yield('lambda')


const CodeBuildHook = (role: iam.IRole, roleCodeBuild: iam.IRole): pure.IPure<api.LambdaIntegration> => {
  const wrap = pure.wrap(api.LambdaIntegration)
  const iaac = pure.iaac(lambda.Function)
  const namespace = process.env.NAMESPACE || 'code-build'
  const githubToken = process.env.GITHUB_TOKEN || 'undefined'
  const apiSecret = process.env.API_KEY || 'secret'
  const WebHook = (): lambda.FunctionProps => 
    ({
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'webhook.main',
      role,
      environment: {
        'CODE_BUILD_BASE': `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${namespace}`,
        'CODE_BUILD_ROLE': roleCodeBuild.roleName,
        'GITHUB_TOKEN': githubToken,
        'API_KEY': apiSecret
      }
    })
  
  return wrap(iaac(WebHook))
}

//
//
const Role = (): pure.IPure<iam.Role> =>
  pure.iaac(iam.Role)(WebHookRole)
    .effect(x => x.addToPolicy(AllowCodeBuild()))
    .effect(x => x.addToPolicy(AllowLogsWrite()))
    .effect(x => x.addToPolicy(AllowIAMConfig()))


const WebHookRole = (): iam.RoleProps =>
  ({ assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') })

const AllowLogsWrite = (): iam.PolicyStatement =>
  new iam.PolicyStatement({
    resources: ['*'],
    actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
  })

const AllowCodeBuild = (): iam.PolicyStatement =>
  new iam.PolicyStatement({
    resources: ['*'],
    actions: ['codebuild:*']
  })

const AllowIAMConfig = (): iam.PolicyStatement =>
  new iam.PolicyStatement({
    resources: [`arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:role/CodeBuildBot-*`],
    actions: ['iam:GetRole', 'iam:PassRole']
  })
