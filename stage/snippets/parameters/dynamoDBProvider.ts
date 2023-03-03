import { DynamoDBProvider } from '@aws-lambda-powertools/parameters/dynamodb';

const dynamoDBProvider = new DynamoDBProvider({ tableName: 'my-table' });

export const handler = async (): Promise<void> => {
  // Retrieve a value from DynamoDB
  const value = await dynamoDBProvider.get('my-parameter');
  console.log(value);
};