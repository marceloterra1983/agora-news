export function parseDatabaseUrl(connectionString: string): {
  host: string;
  port: number | undefined;
  user: string;
  password: string;
  database: string;
};

export function postgresPoolConfig(
  connectionString: string,
  extra?: Record<string, unknown>,
): {
  host: string;
  port: number | undefined;
  user: string;
  password: string;
  database: string;
  ssl: false | { rejectUnauthorized: true; ca?: string };
};
