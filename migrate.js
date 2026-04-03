const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = "https://iamlprhjtsouxlwjzqjl.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbWxwcmhqdHNvdXhsd2p6cWpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxMjU2MCwiZXhwIjoyMDg5Mzg4NTYwfQ.bg04iBHsmAkUbjrlW97vqEJaL6La9JmHVLdTEUsg8ik";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    console.log("📝 Reading SQL migration...");
    const sqlContent = fs.readFileSync("supabase/support_chat_system.sql",  "utf-8");

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

    console.log("✨ Migration executed successfully!");
    const result = await response.json();
    console.log("Result:", result);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

runMigration();
