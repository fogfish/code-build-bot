import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'

//
//
export function CodeBuildRole(parent: cdk.Construct): iam.Role {
  const role = new iam.Role(parent, 'CodeBuildRole',
    {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    }
  )
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess"))
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaFullAccess"))
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayAdministrator"))
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("IAMFullAccess"))
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonRoute53FullAccess"))
  role.addToPolicy(AllowLogsWrite())
  role.addToPolicy(AllowSecretManagerReadOnly())
  return role
}

//
//
export function CodeDeployRole(parent: cdk.Construct): iam.Role {
  const role = new iam.Role(parent, 'CodeDeployRole',
    {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    }
  )

  return role
}

//
//
export function WebHookRole(parent: cdk.Construct): iam.Role {
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

//
//
export function SupervisorRole(parent: cdk.Construct): iam.Role {
  const role = new iam.Role(parent, 'SupervisorRole',
    {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    }
  )
  role.addToPolicy(AllowCodeBuildAll())
  role.addToPolicy(AllowLogsWrite())
  return role
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
