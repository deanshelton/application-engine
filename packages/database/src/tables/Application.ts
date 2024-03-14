import { createId } from '@paralleldrive/cuid2';
import * as dynamoose from 'dynamoose';

import { Item } from 'dynamoose/dist/Item';
import { dynamooseTags, getTableName } from '../helpers';

if (process.env.DYNAMO_ENDPOINT) {
  dynamoose.aws.ddb.local(process.env.DYNAMO_ENDPOINT);
}

export interface ApplicationInterface extends Item {
  id: string;
  type: string;
  name: string;
  formJson: any;
}

export const Application = dynamoose.model<ApplicationInterface>(
  getTableName('application'),
  new dynamoose.Schema(
    {
      id: {
        type: String,
        hashKey: true,
        default: createId,
        required: true,
      },
      type: {
        type: String,
        required: true,
        index: {
          type: 'global',
          name: 'slug_index',
        },
      },
      name: {
        type: String,
        required: true,
      },
      formJson: {
        type: Object,
        required: true,
      },
    },
    { saveUnknown: true }
  ),
  {
    create: true,
    waitForActive: true,
    tags: dynamooseTags,
    throughput: 'ON_DEMAND',
  }
);

export const getAllApplications = async () => {
  return Application.scan().all().exec();
};
