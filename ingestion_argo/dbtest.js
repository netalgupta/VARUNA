// // test-db.js
// import pg from "pg";
// import "dotenv/config";

// const { Client } = pg;

// const client = new Client({
//   host: process.env.PG_HOST,
//   port: process.env.PG_PORT,
//   database: process.env.PG_DATABASE,
//   user: process.env.PG_USER,
//   password: process.env.PG_PASSWORD,
//   ssl: false,
//   connectionTimeoutMillis: 10000,
// });

// try {
//   console.log("Connecting to Supabase...");

//   await client.connect();

//   const result = await client.query("SELECT NOW()");

//   console.log("✅ Supabase connection successful!");
//   console.log("Database time:", result.rows[0].now);

//   await client.end();
// } catch (error) {
//   console.error("❌ Supabase connection failed!");
//   console.error(error.message);
// }






import pg from "pg";
import "dotenv/config";

const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres.skbxtnjcvutzgkzgrrxr:HelloWorldIsSoLame@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log("Connecting to Supabase Session Pooler...");

try {
  await client.connect();

  console.log("✅ Supabase Session Pooler connection successful!");

  const result = await client.query(`
    SELECT
      current_database() AS database,
      current_user AS user,
      NOW() AS database_time;
  `);

  console.table(result.rows);

  await client.end();
} catch (err) {
  console.error("❌ Supabase Session Pooler connection failed!");
  console.error(err.message);
}