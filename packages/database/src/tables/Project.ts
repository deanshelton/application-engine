import { createId } from '@paralleldrive/cuid2';
import * as dynamoose from 'dynamoose';

import { Item } from 'dynamoose/dist/Item';
import { dynamooseTags, getTableName } from '../helpers';

export interface ProjectDynamooseModel extends Object, Item {}

if (process.env.DYNAMO_ENDPOINT) {
  dynamoose.aws.ddb.local(process.env.DYNAMO_ENDPOINT);
}

export const Project = dynamoose.model<ProjectDynamooseModel>(
  getTableName('project'),
  new dynamoose.Schema(
    {
      id: {
        type: String,
        hashKey: true,
        default: createId,
      },
      name: {
        type: String,
      },
      description: {
        type: String,
      },
      socials: {
        type: Object,
        schema: {
          discord: String,
          instagram: String,
          youtube: String,
          twitter: String,
          reddit: String,
          tiktok: String,
        },
      },
      termsOfService: {
        type: String,
      },
      privacyPolicy: {
        type: String,
      },
      copyright: {
        type: String,
      },
      campaignIds: {
        type: Array,
        required: false,
        schema: [String],
      } as any,
      accountId: {
        type: String,
        index: {
          type: 'global',
          name: 'account_id_index',
        },
        set: (value) => String(value).toLowerCase(),
      },
      heroBackgroundMediaId: {
        type: String,
        required: false,
      },
      thumbnailMediaId: {
        type: String,
        required: true,
      },
    },
    { timestamps: true }
  ),
  {
    create: true,
    waitForActive: true,
    tags: dynamooseTags,
    throughput: 'ON_DEMAND',
  }
);
