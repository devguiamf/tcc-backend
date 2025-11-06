import { ColumnOptions } from 'typeorm';
import { UserType } from '../types/user.types';

/**
 * Returns the appropriate column configuration for UserType enum
 * based on the database type. Uses enum for MySQL and varchar for SQLite.
 *
 * @returns ColumnOptions for the type field
 */
export function getUserTypeColumnOptions(): ColumnOptions {
  const isTestEnvironment =
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.DB_TYPE === 'sqlite';

  if (isTestEnvironment) {
    return {
      type: 'varchar',
      length: 20,
      enum: UserType,
      default: UserType.CLIENTE,
    };
  }

  return {
    type: 'enum',
    enum: UserType,
    default: UserType.CLIENTE,
  };
}

