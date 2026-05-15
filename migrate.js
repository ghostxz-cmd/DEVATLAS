const fs = require("fs");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sqlFile = process.argv[2] || "supabase/course_group_chat.sql";

async function runMigration() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }

    console.log("📝 Reading SQL migration...");
    const sqlContent = fs.readFileSync(sqlFile, "utf-8");

    // Use Supabase REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sqlContent }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Error:", error);
      process.exit(1);
    }

  console.log(`✨ Migration executed successfully from ${sqlFile}!`);
    const result = await response.json();
    console.log("Result:", result);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

runMigration();
