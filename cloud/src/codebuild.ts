//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as pure from 'aws-cdk-pure'
import * as cdk from '@aws-cdk/core'
import * as events from '@aws-cdk/aws-events'
import * as target from '@aws-cdk/aws-events-targets'
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam'

export const Supervisor = (): pure.IPure<events.IRule> =>
  pure.wrap(target.LambdaFunction)(
    pure.iaac(iam.Role)(SupervisorRole)
    .effect(x => x.addToPolicy(AllowLogsWrite()))
    .effect(x => x.addToPolicy(AllowCodeBuild()))
    .flatMap(Lambda)
  ).flatMap(CloudWatchRule)
    

//
const SupervisorRole = (): iam.RoleProps =>
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

//
const Lambda = (role: iam.IRole): pure.IPure<lambda.Function> => {
  const iaac = pure.iaac(lambda.Function)
  const githubToken = process.env.GITHUB_TOKEN || 'undefined'
  const Supervisor = (): lambda.FunctionProps =>
  ({
    runtime: lambda.Runtime.NODEJS_10_X,
    code: new lambda.AssetCode('../apps/webhook'),
    handler: 'supervisor.main',
    timeout: cdk.Duration.seconds(120),
    role,
    environment: { 'GITHUB_TOKEN': githubToken }
  })
  return iaac(Supervisor)
}



//
const CloudWatchRule = (f: target.LambdaFunction): pure.IPure<events.Rule> => {
  const iaac = pure.iaac(events.Rule)
  const CodeBuildRule = (): events.RuleProps =>
  ({
    enabled: true,
    eventPattern: {
      source: ['aws.codebuild'],
      detailType: ['CodeBuild Build State Change'],
      detail: {
        'build-status': ['IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'STOPPED']
      }
    },
    targets: [f]
  })
  return iaac(CodeBuildRule)
} 

//
//
export const Role = (): pure.IPure<iam.IRole> =>
  pure.iaac(iam.Role)(CodeBuildRole)
    .effect(x => x.addManagedPolicy(AWSCloudFormationFullAccess))
    .effect(x => x.addManagedPolicy(AWSLambdaFullAccess))
    .effect(x => x.addManagedPolicy(AmazonAPIGatewayAdministrator))
    .effect(x => x.addManagedPolicy(IAMFullAccess))
    .effect(x => x.addManagedPolicy(AmazonRoute53FullAccess))
    .effect(x => x.addManagedPolicy(AmazonSQSFullAccess))
    .effect(x => x.addToPolicy(AllowLogsWrite()))
    .effect(x => x.addToPolicy(AllowSecretManagerReadOnly()))
    .effect(x => x.addToPolicy(KMSFullAccess()))


const CodeBuildRole = (): iam.RoleProps =>
  ({ assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com') })

const AWSCloudFormationFullAccess = iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess")
const AWSLambdaFullAccess = iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess")
const AmazonAPIGatewayAdministrator = iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayAdministrator")
const IAMFullAccess = iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess")
const AmazonRoute53FullAccess = iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonRoute53FullAccess")
const AmazonSQSFullAccess = iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess")

const AllowSecretManagerReadOnly = (): iam.PolicyStatement =>
  new iam.PolicyStatement({
    resources: ['*'],
    actions: ['secretsmanager:GetSecretValue']
  })

const KMSFullAccess = (): iam.PolicyStatement =>
  new iam.PolicyStatement({
    resources: ['*'],
    actions: [
      // AWSKeyManagementServicePowerUser
      "kms:CreateAlias",
      "kms:CreateKey",
      "kms:DeleteAlias",
      "kms:Describe*",
      "kms:GenerateRandom",
      "kms:Get*",
      "kms:List*",
      "kms:TagResource",
      "kms:UntagResource",
      "iam:ListGroups",
      "iam:ListRoles",
      "iam:ListUsers",

      'kms:PutKeyPolicy'
    ]
  })

