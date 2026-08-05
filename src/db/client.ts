import { SQL } from "bun";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/xatwoot";

export const db = new SQL(DATABASE_URL);

export default db;
