const { sendAlert, getEmailStatus } = require("../Cloud_Functions/alert_handler");

async function runTest() {
  console.log("=========================================");
  console.log("🛡️ SPECTR Email Sender System Test");
  console.log("=========================================");

  const status = getEmailStatus();
  console.log("📋 Current Configuration:");
  console.log(` - Configured: ${status.configured}`);
  console.log(` - Sender Email: ${status.sender}`);
  console.log(` - Recipients: ${status.recipients.join(", ") || "None"}`);
  console.log(` - Nodemailer Installed: ${status.hasNodemailer}`);
  console.log(` - Transport: ${status.smtpHost}`);
  console.log("-----------------------------------------");

  if (!status.configured) {
    console.error("❌ ERROR: Email credentials missing.");
    console.log("💡 Fix: Set ALERT_EMAIL and ALERT_PASSWORD in backend/.env");
    process.exit(1);
  }

  console.log("📧 Sending Test Intrusion Alert Email...");

  try {
    const res = await sendAlert(
      "🚨 SYSTEM DIAGNOSTIC TEST ALERT",
      "This is a test notification from the SPECTR Tactical System to verify real-time email dispatch.\n\nAll security subsystems operational.",
      { severity: "INFO" }
    );
    console.log("✅ SUCCESS!");
    console.log(`📩 Dispatched to: ${res.recipients}`);
    console.log(`📝 Response: ${res.response}`);
    console.log("=========================================");
  } catch (err) {
    console.error("❌ EMAIL DISPATCH FAILED!");
    console.error(`Error details: ${err.message}`);
    console.log("-----------------------------------------");

    if (err.message.includes("535 5.7.8") || err.message.includes("Username and Password not accepted")) {
      console.log("🔐 GMAIL CREDENTIALS ERROR:");
      console.log("1. Ensure 2-Step Verification is ENABLED on your Google Account.");
      console.log("2. Generate a new App Password: https://myaccount.google.com/apppasswords");
      console.log("3. Paste the 16-character App Password into backend/.env as ALERT_PASSWORD");
    }
    console.log("=========================================");
    process.exit(1);
  }
}

runTest();
