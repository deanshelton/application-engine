const { APP_ENV = 'development', APP_NAME } = process.env;

export const Tags = [
  { Key: 'ManagedByTerraform', Value: 'false' },
  {
    Key: 'Environment',
    Value: APP_ENV,
  },
  {
    Key: 'Application',
    Value: 'appSystem',
  },
];

export function getTableName(name: string) {
  return `${APP_ENV}-appSystem-${name}`;
}

export const dynamooseTags = {
  ManagedByTerraform: 'false',
  Environment: APP_ENV,
  Application: APP_NAME || 'appSystem',
};
