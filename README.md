# Serverless Code Build

A bot automates pull requests delivery. It implements lightweight CI/CD pipelines, which are capable to deliver your microservices to cloud environments. This projects allows you to forget about housekeeping and administration of Jenkins or similar systems. The bot suites small engineering teams who owns entire life cycle of application.

## Inspiration

<img src="./workflow.svg" width="300" align="left"/>

The bot is optimized to support either forking or branching workflow. Please see [Atlassian tutorial](https://www.atlassian.com/git/tutorials/comparing-workflows#forking-workflow) about them. As part of these workflows, it puts a strong focus to support engineering team with continuous **integration**, continuous **delivery** and continuous **deployment** of microservices. Continuous deployment is a key here. Please takes a look on few posts about this subject

[Practical continuous deployment: a guide to automated software delivery](https://www.atlassian.com/blog/continuous-delivery/practical-continuous-deployment) 

[Continuous Deployment at Instagram](https://instagram-engineering.com/continuous-deployment-at-instagram-1e18548f01d1)


### Why this bot exists?

We are building our solutions using small-decoupled deliverables - microservices. Our CI/CI still looks like monolith. Containers are the right approach to configure and deliver build environments, so called **build toolkit**. This bot provides an integration layer to [AWS CodeBuild](https://aws.amazon.com/codebuild/), which is a fully managed continuous integration service.

The Code Build Bot does similar things as [AWS Code Pipeline](https://aws.amazon.com/codepipeline/) with an exception everything happens inside single CodeBuild session. Code Pipeline do have **cost factor** unless you are using [Monorepo](https://en.wikipedia.org/wiki/Monorepo). My workflows are optimized to gain most of productivity using Multirepo. You can easily inflate Code Pipeline costs above $1200 per year.

**Infrastructure as a Code** is only the right way to manage cloud resources. The provisioning and deployment of cloud resources shall be aligned with a service delivery and orchestrated by CI/CD system. This bot supports IaaC automation using either [Cloud Formation](https://aws.amazon.com/cloudformation/) or [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html). The **deployment automation** is a key feature here, please see my workflow for details. 

Often, **flexibility on configurations** becomes an issue if you are using CI/CD DSL or point-and-click UIs, especially if you are aiming 100% automation. Everything shall be code including CI/CD pipelines. The Code Build Bot promotes usage of AWS CDK or shell scripts to implement delivery pipelines. This is extremely important with modern processes that relies on heterogenous technologies (e.g. `npm` is optimized for building and packaging JavaScript application but this is a wrong tool to make cloud deployments - `cdk` shall be used). 

As developer I want to have a **repeatable pipelines** so that exactly same automation pipeline is executed by CI/CD and myself while testing/development. This overlooked if your team follows segregation of application development from operations (DevOps). This also means co-allocation of pipelines configuration next to application code. 

<!--
TODO:
  * Cloud Secret Management
  * Privately Owned Build Environments
-->

Afterwords, CI/CD is not a rocket science. The market is full of various solution. Almost all cloud providers has they own, almost any software version control system offers they own. You have to choose a solution that suites your workflow. The Code Build Bot has been developed just to resolve my customization requirements. I'd like to have a depth sense of machinery that makes an automation.


### Workflow


Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.


### Key features

* Check, Build and Carry your software to cloud without thinking about servers.
* Uses AWS Serverless technologies: AWS Lambda, AWS Code Build, etc
* Zero configuration (configure once)


## Requirements

```
npm install -g aws-cdk typescript ts-node
```

## Required Hooks

- Branch or tag deletion
- Branch or tag creation
- Pull requests
- Pushes


## Environment

- process.env.NAMESPACE (ECR - default code-build, explain details)
- process.env.GITHUB_TOKEN (Personal access token with repo permission )
- process.env.API_KEY (https://developer.github.com/webhooks/securing/)





