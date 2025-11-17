import * as dotenv from 'dotenv';
dotenv.config();

import { S3Client } from '@aws-sdk/client-s3';

const { AWS_REGION, AWS_BUCKET, AWS_ACCESS_KEY, AWS_SECRET_KEY } = process.env;

if (!AWS_BUCKET || !AWS_REGION || !AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
  throw new Error('[S3 Config] Missing AWS environment variables');
}

export const S3_BUCKET = AWS_BUCKET;

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});
