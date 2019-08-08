import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as lambda from '@aws-cdk/aws-lambda'
import * as api from '@aws-cdk/aws-apigateway'
import * as logs from '@aws-cdk/aws-logs'
import * as events from '@aws-cdk/aws-events'
import * as targets from '@aws-cdk/aws-events-targets'
import { _ } from './pure'

//
//
function CodeBuildEvents(parent: cdk.Construct): events.Rule {
  const target = new targets.LambdaFunction( Supervisor(parent) )
  return new events.Rule(parent, 'CodeBuildEvents', 
    {
      enabled: true,
      eventPattern: {
        source: ['aws.codebuild'],
        detailType: ['CodeBuild Build State Change'],
        detail: {
          'build-status': ['IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'STOPPED']
        }
      },
      targets: [target]
    }
  )
}

//
//
function CodeBuildRole(parent: cdk.Construct): iam.Role {
  const role = new iam.Role(parent, 'CodeBuildRole',
    {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    }
  )
  role.addToPolicy(AllowLogsWrite())
  role.addToPolicy(AllowLambdaAll())
  return role
}

function AllowLambdaAll(): iam.PolicyStatement {
  return new iam.PolicyStatement({
    resources: ['*'],
    actions: ['lambda:*']
  })
}

//
//
function LogGroup(parent: cdk.Construct): cdk.Construct {
  return new logs.LogGroup(parent, 'LogGroup',
    {
      logGroupName: '/aws/codebuild/bot',
      retention: logs.RetentionDays.ONE_WEEK
    }
  )
}


//
//
function WebHookRole(parent: cdk.Construct): iam.Role {
  const role = new iam.Role(parent, 'WebHookRole',
    {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    }
  )
  role.addToPolicy(AllowCodeBuildAll())
  role.addToPolicy(AllowLogsWrite())
  role.addToPolicy(AllowIAMConfig())
  return role
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

function AllowIAMConfig(): iam.PolicyStatement {
  return new iam.PolicyStatement({
    resources: ['arn:aws:iam::' + cdk.Aws.ACCOUNT_ID + ':role/CodeBuildBot-*'],
    actions: ['iam:GetRole', 'iam:PassRole']
  })
}

//
//
function SupervisorRole(parent: cdk.Construct): iam.Role {
  const role = new iam.Role(parent, 'SupervisorRole',
    {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    }
  )
  role.addToPolicy(AllowLogsWrite())
  return role
}

//
//
function WebHook(parent: cdk.Construct): lambda.Function {
  const namespace = process.env.NAMESPACE || 'code-build'
  const role = CodeBuildRole(parent)
  return new lambda.Function(parent, 'WebHook',
    {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'webhook.main',
      role: WebHookRole(parent),
      environment: {
        'CODE_BUILD_BASE': `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${namespace}`,
        'CODE_BUILD_ROLE': role.roleName,
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
        'API_KEY': process.env.API_KEY
      }
    }
  )
}

function Supervisor(parent: cdk.Construct): lambda.Function {
  return new lambda.Function(parent, 'Supervisor',
    {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/webhook'),
      handler: 'supervisor.main',
      role: SupervisorRole(parent),
      environment: {
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN
      }
    }
  )
}

//
//
function Gateway(parent: cdk.Construct): api.RestApi {
  return new api.RestApi(parent, 'Gateway',
    {
      deploy: true,
      deployOptions: {
        stageName: 'api'
      },
      failOnWarnings: true,
      endpointTypes: [api.EndpointType.REGIONAL]
    }
  )
}

//
//
function RestApi(parent: cdk.Construct): cdk.Construct {
  const rest = Gateway(parent)
  const webhook = new api.LambdaIntegration( WebHook(parent) )

  rest.root.addResource('webhook').addMethod('POST', webhook)
  return rest
}

//
//
function CodeBuildBot(stack: cdk.Construct): cdk.Construct {
  _(stack, RestApi)
  _(stack, LogGroup)
  _(stack, CodeBuildEvents)
  return stack
}

const app = new cdk.App()
_(app, CodeBuildBot)
app.synth()
