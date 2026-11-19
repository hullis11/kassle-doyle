import { readFile } from 'node:fs/promises';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// same naming as core.yml, values come from the buildspec
const tableName =
  `${process.env.CUST_NAME}-${process.env.APP_NAME}-${process.env.ENV_NAME}-games`;

// codebuild sets AWS_REGION for us
const client = new DynamoDBClient( {
  region: process.env.AWS_REGION,
} );

const docClient = DynamoDBDocumentClient.from( client );

const gamesArray = JSON.parse(
  await readFile( new URL( './gamesArray.json', import.meta.url ), 'utf8' )
);

let added = 0;

try {
  for ( const game of gamesArray ) {
    try {
      await docClient.send(
        new PutCommand( {
          TableName: tableName,
          Item: {
            ...game,
            PK: game.gameId,
            SK: 'BOARD',
            entityType: 'GAME',
          },
          // skip games that are already there so redeploys don't reset them
          ConditionExpression: 'attribute_not_exists( PK )',
        } )
      );
      added++;
    } catch ( error ) {
      if ( error.name !== 'ConditionalCheckFailedException' ) throw error;
    }
  }

  console.log( `Seeded ${added} of ${gamesArray.length} games into ${tableName}` );
} catch ( error ) {
  console.error( 'Unable to seed games', error );
  // fail the build so it gets noticed
  process.exitCode = 1;
}
