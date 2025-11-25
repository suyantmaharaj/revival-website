import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

const EMAILJS_PUBLIC_KEY = "0Xb2U08LxmtL-sARN";
const EMAILJS_SERVICE_ID = "service_onoip14";
const EMAILJS_OTP_TEMPLATE_ID = "template_xse8zll";

let emailInitialized = false;
function ensureEmailInitialized() {
  if (emailInitialized) return;
  emailjs.init(EMAILJS_PUBLIC_KEY);
  emailInitialized = true;
}

export async function sendOtpEmail(email, name, otpCode) {
  if (!email) {
    console.warn("sendOtpEmail called without an email address");
    return;
  }

  ensureEmailInitialized();

  const params = {
    to_email: email,
    to_name: name || "there",
    otp: otpCode,
  };

  try {
    const result = await emailjs.send(
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
