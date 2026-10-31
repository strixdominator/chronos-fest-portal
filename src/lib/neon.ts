import { neon } from '@neondatabase/serverless';

const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_sm8acC3uEGQr@ep-withered-bread-a1nmxims-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const sql = neon(connectionString);
