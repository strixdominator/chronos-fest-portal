import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

export const isNeonConfigured = Boolean(connectionString);

export const sql = neon(
  connectionString || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
);

