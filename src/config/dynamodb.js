import dynamoose     from 'dynamoose';
import AWS           from 'aws-sdk';
import dynamodbLocal from 'dynamodb-localhost';
import path          from 'path';

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: "http://localhost:8000"
}

AWS.config.update(awsConfig);

let dynamodb = new AWS.DynamoDB();

dynamoose.AWS.config.update(awsConfig);

if (process.env.NODE_ENV == "development") {
  dynamodbLocal.install(() => {
    dynamodbLocal.stop(8000);
    dynamodbLocal.start({ 
      port: 8000, /* Port to listen on. Default: 8000 */
      cors: '*', /* Enable CORS support (cross-origin resource sharing) for JavaScript. You must provide a comma-separated "allow" list of specific domains. The default setting for cors is an asterisk (*), which allows public access. */
      inMemory: false, /* default is true DynamoDB; will run in memory, instead of using a database file. When you stop DynamoDB;, none of the data will be saved. Note that you cannot specify both dbPath and inMemory at once. */
      dbPath:  path.join(__dirname, '/../../tmp/'), /* The directory where DynamoDB will write its database file. If you do not specify this option, the file will be written to the current directory. Note that you cannot specify both dbPath and inMemory at once. For the path, current working directory is <projectroot>/node_modules/dynamodb-localhost/dynamob. For example to create <projectroot>/node_modules/dynamodb-localhost/dynamob/<mypath> you should specify '<mypath>/' with a forwardslash at the end. */
      sharedDb: true, /* DynamoDB will use a single database file, instead of using separate files for each credential and region. If you specify sharedDb, all DynamoDB clients will interact with the same set of tables regardless of their region and credential configuration. */
      delayTransientStatuses: true, /* Causes DynamoDB to introduce delays for certain operations. DynamoDB can perform some tasks almost instantaneously, such as create/update/delete operations on tables and indexes; however, the actual DynamoDB service requires more time for these tasks. Setting this parameter helps DynamoDB simulate the behavior of the Amazon DynamoDB web service more closely. (Currently, this parameter introduces delays only for global secondary indexes that are in either CREATING or DELETING status.) */
      optimizeDbBeforeStartup: true /* Optimizes the underlying database tables before starting up DynamoDB on your computer. You must also specify -dbPath when you use this parameter. */
    });
    dynamoose.local();
  });
}

export { dynamoose, dynamodb };