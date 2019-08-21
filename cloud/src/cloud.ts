import { Function } from '@aws-cdk/aws-lambda'
import { LambdaFunction } from '@aws-cdk/aws-events-targets'
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway'
import { LogGroup } from '@aws-cdk/aws-logs';
import { Rule } from '@aws-cdk/aws-events';
import { iaac, wrap } from './pure'

export const lambda = iaac(Function)

export const gateway = iaac(RestApi)

export const logs = iaac(LogGroup)

export const rule = iaac(Rule)

export const events = wrap(LambdaFunction)

export const resource = wrap(LambdaIntegration)

