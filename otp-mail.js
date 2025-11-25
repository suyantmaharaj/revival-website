const EMAILJS_PUBLIC_KEY = "0Xb2U08LxmtL-sARN";
const EMAILJS_SERVICE_ID = "service_onoip14";
const EMAILJS_OTP_TEMPLATE_ID = "template_xse8zll";

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

export async function sendOtpEmail(email, name, otpCode) {
  if (!email) {
    console.warn("sendOtpEmail called without an email address");
    return;
  }

  const client = ensureEmailInitialized();
  if (!client) return;

  const params = {
    to_email: email,
    email, // in case template uses a different variable name
    to_name: name || "there",
    otp: otpCode,
  };

  try {
    const result = await client.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_OTP_TEMPLATE_ID,
      params
    );
    console.log("OTP email sent", result.status);
  } catch (error) {
    console.error("EmailJS error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw error;
  }
}
