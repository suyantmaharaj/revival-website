import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

const EMAILJS_PUBLIC_KEY = "0Xb2U08LxmtL-sARN";
const EMAILJS_SERVICE_ID = "service_onoip14";
const EMAILJS_WELCOME_TEMPLATE_ID = "template_9urh7za";

let emailInitialized = false;
function ensureEmailInitialized() {
  if (emailInitialized) return;
  emailjs.init(EMAILJS_PUBLIC_KEY);
  emailInitialized = true;
}

export async function sendWelcomeEmail(email, name) {
  if (!email) {
    console.warn("sendWelcomeEmail skipped: email is required");
    return;
  }

  ensureEmailInitialized();

  const params = {
    to_email: email,
    to_name: name || "there",
  };

  try {
    return await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_WELCOME_TEMPLATE_ID, params);
  } catch (err) {
    console.error("EmailJS error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    throw err;
  }
}
