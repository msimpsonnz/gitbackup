import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import { Duration } from '@aws-cdk/core';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFn = new lambda.Function(this, 'git-backup', {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'handler.run',
      code: lambda.Code.asset('../func/function.zip'),
      //layers: 
    });

    const submitJob = new sfn.Task(this, 'Submit Job', {
        task: new tasks.InvokeFunction(lambdaFn),
        // Put Lambda's result here in the execution's state object
        resultPath: '$.guid',
    });
    
    const waitX = new sfn.Wait(this, 'Wait X Seconds', {
      time: sfn.WaitTime.secondsPath('$.wait_time'),
    });
    
    const jobFailed = new sfn.Fail(this, 'Job Failed', {
        cause: 'AWS Batch Job Failed',
        error: 'DescribeJob returned FAILED',
    });
    
    
    const definition = submitJob
        .next(waitX)
        // .next(new sfn.Choice(this, 'Job Complete?')
        //     // Look at the "status" field
        //     .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
        //     .when(sfn.Condition.stringEquals('$.status', 'SUCCEEDED'), finalStatus)
        //     .otherwise(waitX));
    
    new sfn.StateMachine(this, 'StateMachine', {
        definition,
       
    
     timeout: Duration.minutes(5)
    });
    
  }
}
