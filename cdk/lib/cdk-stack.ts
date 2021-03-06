import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-events');
import targets = require('@aws-cdk/aws-events-targets');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import { Duration } from '@aws-cdk/core';
import sam = require('@aws-cdk/aws-sam');
import api = require('@aws-cdk/aws-apigateway');
import { ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { EmptyModel, MethodResponse, MethodOptions, IntegrationResponse, IntegrationOptions } from '@aws-cdk/aws-apigateway';

const AWSCLI_LAYER_APP_ARN = 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli';
const AWSCLI_VERSION = '1.16.213';
const GIT_LAYER_ARN = 'arn:aws:lambda:ap-southeast-2:553035198032:layer:git:5';
const _GITHUB_REPO = 'https://github.com/msimpsonnz';
const _GITHUB_REPO_LIST = 'https://raw.githubusercontent.com/msimpsonnz/gitbackup/master/repo.json';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaRole = new iam.Role(this, 'CodeCommitRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSCodeCommitPowerUser'));

    const apiGatewayRole = new iam.Role(this, 'ApiGatewayRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
    });

    const awscliLayer = new sam.CfnApplication(this, 'awscliLayer', {
      location: {
        applicationId: AWSCLI_LAYER_APP_ARN,
        semanticVersion: AWSCLI_VERSION
      }
    });

    const layerVersionArn = awscliLayer.getAtt('Outputs.LayerVersionArn').toString()

    const lambdaFn = new lambda.Function(this, 'git-backup', {
      functionName: "git-backup-func",
      role: lambdaRole,
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'handler.run',
      code: lambda.Code.asset('../func/function.zip'),
      memorySize: 512,
      timeout: Duration.seconds(300),
      environment: {
        GITHUB_REPO: _GITHUB_REPO,
        GITHUB_REPO_LIST: _GITHUB_REPO_LIST
      }
    });

    lambdaFn.addLayers(
      lambda.LayerVersion.fromLayerVersionArn(this, 'cliLayerVersion', layerVersionArn),
      lambda.LayerVersion.fromLayerVersionArn(this, 'gitLayerVersion', GIT_LAYER_ARN),
    );

    const rule = new events.Rule(this, 'Rule', {
      schedule: {
        expressionString: 'cron(0 18 ? * FRI *)'
      }
    });

    rule.addTarget(new targets.LambdaFunction(lambdaFn));

    //Create new Step Function Task
    const submitJob = new sfn.Task(this, 'Submit Job', {
        //This task invokes out Lambda function
        task: new tasks.InvokeFunction(lambdaFn),
        resultPath: '$.guid',
    });
    
    //Create the State Machine for the Step Function
    const state = new sfn.StateMachine(this, 'StateMachine', {
      stateMachineName: "gitbackup-sfn",
      //Provide the job definition from above
      definition: submitJob,
      timeout: Duration.minutes(5)
    });

    //Give Step Function IAM Role permission to invoke Lambda
    lambdaFn.grantInvoke(state.role);
    //Give API Gateway IAM Role permission to execute Step Function
    state.grantStartExecution(apiGatewayRole);
  
    //Create an empty response model for API Gateway
    var model :EmptyModel = {
      modelId: "Empty"
    };
    //Create a method response for API Gateway using the empty model
    var methodResponse :MethodResponse = {
      statusCode: '200',
      responseModels: {'application/json': model}
    };
    //Add the method options with method response to use in API Method
    var methodOptions :MethodOptions = {
      methodResponses: [
        methodResponse
      ]
    };
    //Create intergration response for SQS
    var integrationResponse :IntegrationResponse = {
      statusCode: '200'
    };
    
    //Create integration options for API Method
    var integrationOptions :IntegrationOptions = {
      credentialsRole: apiGatewayRole,
      requestTemplates: {
        'application/json': JSON.stringify({
          input: '$util.escapeJavaScript($input.body)',
          stateMachineArn: state.stateMachineArn
        })
      },
      integrationResponses: [
        integrationResponse
      ]
    };
    
    //Create the Step Function Integration
    const apiGatewayIntegration = new api.AwsIntegration({ 
      service: "states",
      action: "StartExecution",
      integrationHttpMethod: "POST",
      options: integrationOptions,
    });

    const apiGateway = new api.RestApi(this, "gitBackup-api");


    //Create a API Gateway Resource
    const msg = apiGateway.root.addResource('msg');
    //Create a Resource Method
    msg.addMethod('POST', apiGatewayIntegration, methodOptions);

  }
}
