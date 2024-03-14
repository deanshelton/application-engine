import * as dynamoose from 'dynamoose';

if (process.env.DYNAMO_ENDPOINT) {
  dynamoose.aws.ddb.local(process.env.DYNAMO_ENDPOINT);
}

export * from './tables';
export const Condition = dynamoose.Condition;
