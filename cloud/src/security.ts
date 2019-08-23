//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This file may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
// https://github.com/fogfish/code-build-bot
//
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import { IaaC, use } from 'aws-cdk-pure'
import * as cloud from './cloud' 

//
//
function CodeBuildRole(): iam.RoleProps {
  return {
    assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
  }
}

export function CodeBuild(): IaaC<iam.Role> {
  const role = cloud.role(CodeBuildRole)
  return use({ role })
    .effect(x => {
      x.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess"))
      x.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess"))
      x.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayAdministrator"))
      x.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"))
      x.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonRoute53FullAccess"))
      x.role.addToPolicy(AllowLogsWrite())
      x.role.addToPolicy(AllowSecretManagerReadOnly())
    })
    .yield('role')
}

//
//
function WebHookRole(): iam.RoleProps {
  return {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
  }
}

export function WebHook(): IaaC<iam.Role> {
  const role = cloud.role(WebHookRole)
  return use({ role })
    .effect(x => {
      x.role.addToPolicy(AllowCodeBuildAll())
      x.role.addToPolicy(AllowLogsWrite())
      x.role.addToPolicy(AllowIAMConfig())
    })
    .yield('role')
}

//
//
function SupervisorRole(): iam.RoleProps {
  return {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
  }
}

export function Supervisor(): IaaC<iam.Role> {
  const role = cloud.role(SupervisorRole)
  return use({ role })
    .effect(x => {
      x.role.addToPolicy(AllowCodeBuildAll())
      x.role.addToPolicy(AllowLogsWrite())
    })
    .yield('role')
}

//
//
function AllowIAMConfig(): iam.PolicyStatement {
  return new iam.PolicyStatement({
    resources: ['arn:aws:iam::' + cdk.Aws.ACCOUNT_ID + ':role/CodeBuildBot-*'],
    actions: ['iam:GetRole', 'iam:PassRole']
  })
}

function AllowLogsWrite(): iam.PolicyStatement {
  return new iam.PolicyStatement({
    resources: ['*'],
    actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']
  })
}

function AllowCodeBuildAll(): iam.PolicyStatement {
  return new iam.PolicyStatement({
    resources: ['*'],
    actions: ['codebuild:*']
  })
}

function AllowSecretManagerReadOnly(): iam.PolicyStatement {
  return new iam.PolicyStatement({
    resources: ['*'],
    actions: ['secretsmanager:GetSecretValue']
  })
}
