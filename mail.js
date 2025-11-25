const EMAILJS_PUBLIC_KEY = "0Xb2U08LxmtL-sARN";
const EMAILJS_SERVICE_ID = "service_onoip14";
const EMAILJS_WELCOME_TEMPLATE_ID = "template_9urh7za";

let emailInitialized = false;
function ensureEmailInitialized() {
  const client = window.emailjs;
  if (!client) {
    console.error("EmailJS error:", "EmailJS client not loaded. Ensure the EmailJS script is included.");
    return null;
  }
  if (emailInitialized) return client;
  client.init(EMAILJS_PUBLIC_KEY);
  emailInitialized = true;
  return client;
}

export async function sendWelcomeEmail(email, name) {
  if (!email) {
    console.warn("sendWelcomeEmail skipped: email is required");
    return;
  }

  const client = ensureEmailInitialized();
  if (!client) return;

  const params = {
    to_email: email,
    email, // in case template uses a different variable name
    to_name: name || "there",
    name: name || "there", // template uses {{name}}
  };

  try {
    return await client.send(EMAILJS_SERVICE_ID, EMAILJS_WELCOME_TEMPLATE_ID, params);
  } catch (err) {
    console.error("EmailJS error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    throw err;
  }
}
