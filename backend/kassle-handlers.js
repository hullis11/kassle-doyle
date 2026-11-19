import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';


// lambda sets AWS_REGION for us
const client = new DynamoDBClient( {
  region: process.env.AWS_REGION,
} );

const docClient = DynamoDBDocumentClient.from( client );

const s3Client = new S3Client( {
  region: process.env.AWS_REGION,
} );

// set per customer in serverless.yml
const allowedOrigins = process.env.ALLOWED_ORIGINS.split( ',' );

// send back the caller's origin if it's on the list
const corsHeaders = ( event ) => {
  const origin = event.headers?.origin ?? event.headers?.Origin;

  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes( origin ) ? origin : allowedOrigins[ 0 ],
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
};

const ADMIN_GROUP = 'admin';
const isAdmin = ( event ) => {
  const groups = event.requestContext?.authorizer?.claims?.['cognito:groups'];
  return String( groups ).includes( ADMIN_GROUP );
};

export const loadScreenshots = async ( event ) => {
  if ( !isAdmin( event ) ) {
    return {
      statusCode: 403,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Not an admin' } ),
    };
  }

  try {
    const result = await docClient.send(
      new ScanCommand( {
        TableName: process.env.SCREENSHOTS_TABLE,
      } )
    );

    // scan comes back unordered, so sort newest first and keep 50
    const items = ( result.Items ?? [] )
      .sort( ( a, b ) => b.timestamp.localeCompare( a.timestamp ) )
      .slice( 0, 50 );

    const screenshots = items.map( ( item ) => ( {
      screenshotId: item.screenshotId,
      userId: item.userId,
      timestamp: item.timestamp,
      whoseTurn: item.whoseTurn,
      gameId: item.gameId,
      s3Key: item.s3Key,
    } ) );

    return {
      statusCode: 200,
      headers: corsHeaders( event ),
      body: JSON.stringify( screenshots ),
    };
  } catch ( error ) {
    console.error( 'Failed to load screenshots:', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Unable to load screenshots' } ),
    };
  }
};

export const getScreenshotUrl = async ( event ) => {
  if ( !isAdmin( event ) ) {
    return {
      statusCode: 403,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Not an admin' } ),
    };
  }

  const key = event.queryStringParameters?.key;

  // only allow files in the screenshots folder
  if ( !key || !key.startsWith( 'screenshots/' ) || key.includes( '..' ) ) {
    return {
      statusCode: 400,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Invalid screenshot key' } ),
    };
  }

  try {
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand( {
        Bucket: process.env.SCREENSHOT_BUCKET,
        Key: key,
      } ),
      // expires in 300 seconds/5 minutes
      { expiresIn: 300 }
    );

    return {
      statusCode: 200,
      headers: corsHeaders( event ),
      body: JSON.stringify( { url } ),
    };
  } catch ( error ) {
    console.error( 'Failed to get screenshot url:', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Unable to load screenshot' } ),
    };
  }
};

export const loadGames = async ( event ) => {
  try {
    const result = await docClient.send(
      new ScanCommand( {
        TableName: process.env.GAMES_TABLE,
        FilterExpression: 'entityType = :type AND SK = :kind',
        ExpressionAttributeValues: {
          ':type': 'GAME',
          ':kind': 'BOARD',
        },
      } )
    );

    return {
      statusCode: 200,
      headers: corsHeaders( event ),
      body: JSON.stringify( result.Items ?? [] ),
    };
  } catch ( error ) {
    console.error( 'Failed to load games:', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Unable to load games' } ),
    };
  }
};

export const loadLeader = async ( event ) => {
  try {
    const records = await docClient.send(
      new ScanCommand( {
        TableName: process.env.GAMES_TABLE,
        FilterExpression: 'SK = :recordType',
        ExpressionAttributeValues: {
          ':recordType': 'RECORD',
        },
      } )
    );

    const leaderboard = ( records.Items ?? [] ).map( ( record ) => ( {
      username: record.PK,
      wins: record.wins ?? 0,
      losses: record.losses ?? 0,
    } ) );

    return {
      statusCode: 200,
      headers: corsHeaders( event ),
      body: JSON.stringify( leaderboard ),
    };
  } catch ( error ) {
    console.error( 'Failed to load leaderboard:', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Unable to load leaderboard' } ),
    };
  }
};

export const saveGame = async ( event ) => {
  let savedGame;

  try {
    savedGame = JSON.parse( event.body );
  } catch ( error ) {
    console.error( 'Failed to parse savedGame from data', error );

    return {
      statusCode: 400,
      headers: corsHeaders( event ),
      body: JSON.stringify( {
        message: 'Unable to parse savedGame from requested data',
      } ),
    };
  }

  try {
    await docClient.send(
      new PutCommand( {
        TableName: process.env.GAMES_TABLE,
        Item: {
          ...savedGame,
          PK: savedGame.gameId,
          SK: 'BOARD',
          entityType: 'GAME',
        },
      } )
    );
  } catch ( error ) {
    console.error( 'Failed to save game to DB', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Unable to save game to DB' } ),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders( event ),
    body: JSON.stringify( { message: 'Successfully saved game' } ),
  };
};

export const saveWinner = async ( event ) => {
  let endresult;

  try {
    endresult = JSON.parse( event.body );
  } catch ( error ) {
    console.error( 'Failed to parse winner from data', error );

    return {
      statusCode: 400,
      headers: corsHeaders( event ),
      body: JSON.stringify( {
        message: 'Unable to parse winner from requested data',
      } ),
    };
  }

  const winnerUsername = endresult.winner === 'Red'
    ? endresult.redUsername
    : endresult.blueUsername;
  const loserUsername = endresult.winner === 'Red'
    ? endresult.blueUsername
    : endresult.redUsername;

  try {
    // winner: +1 win, make sure losses exists
    await docClient.send( new UpdateCommand( {
      TableName: process.env.GAMES_TABLE,
      Key: { PK: winnerUsername, SK: 'RECORD' },
      UpdateExpression:
        'SET wins = if_not_exists( wins, :zero ) + :one, ' +
        'losses = if_not_exists( losses, :zero )',
      ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
    } ) );

    // loser: +1 loss, make sure wins exists
    await docClient.send( new UpdateCommand( {
      TableName: process.env.GAMES_TABLE,
      Key: { PK: loserUsername, SK: 'RECORD' },
      UpdateExpression:
        'SET losses = if_not_exists( losses, :zero ) + :one, ' +
        'wins = if_not_exists( wins, :zero )',
      ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
    } ) );
  } catch ( error ) {
    console.error( 'Unable to update leaderboard', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( {
        message: 'Unable to update leaderboard DB',
      } ),
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders( event ),
    body: JSON.stringify( {
      message: 'Wins and losses saved successfully',
    } ),
  };
};

export const saveScreenshot = async ( event ) => {
  let screenshot;

  try {
    screenshot = JSON.parse( event.body );
  } catch ( error ) {
    console.error( 'Failed to parse screenshot from data', error );

    return {
      statusCode: 400,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Invalid JSON request body' } ),
    };
  }

  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const timestamp = new Date().toISOString();
    const screenshotId = randomUUID();
    const s3Key =
      `screenshots/${timestamp.replace( /[:.]/g, '-' )}-${screenshotId}.png`;
    const imageBase64 = screenshot.image.replace(
      /^data:image\/png;base64,/,
      ''
    );
    const imageBuffer = Buffer.from( imageBase64, 'base64' );

    await s3Client.send(
      new PutObjectCommand( {
        Bucket: process.env.SCREENSHOT_BUCKET,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: 'image/png',
      } )
    );

    await docClient.send(
      new PutCommand( {
        TableName: process.env.SCREENSHOTS_TABLE,
        Item: {
          screenshotId,
          userId,
          timestamp,
          whoseTurn: screenshot.whoseTurn,
          gameId: screenshot.gameId ?? null,
          s3Key,
        },
      } )
    );

    return {
      statusCode: 201,
      headers: corsHeaders( event ),
      body: JSON.stringify( {
        message: 'Screenshot saved successfully',
        screenshotId,
      } ),
    };
  } catch ( error ) {
    console.error( 'Failed to save screenshot:', error );

    return {
      statusCode: 500,
      headers: corsHeaders( event ),
      body: JSON.stringify( { message: 'Unable to save screenshot' } ),
    };
  }
};