import * as dynamoose from 'dynamoose';
import { createId } from '@paralleldrive/cuid2';

import { dynamooseTags, getTableName } from '../helpers';
import { Item } from 'dynamoose/dist/Item';

if (process.env.DYNAMO_ENDPOINT) {
  dynamoose.aws.ddb.local(process.env.DYNAMO_ENDPOINT);
}

interface ApplicationStateInterface extends Item {
  id: string;
  appName: string;
  expire?: number;
  stringValue?: string;
  numericalValue?: number;
}

export const ApplicationState = dynamoose.model<ApplicationStateInterface>(
  getTableName('application-state'),
  new dynamoose.Schema(
    {
      id: {
        type: String,
        hashKey: true,
        default: createId,
        required: true,
      },
      appName: {
        type: String,
        required: true,
        index: {
          type: 'global',
          rangeKey: 'expire',
          project: false,
          name: 'expiry_index',
        },
        default: 'apps',
      },
      expire: {
        type: Number,
      },
      stringValue: {
        type: String,
      },
      numericalValue: {
        type: Number,
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
