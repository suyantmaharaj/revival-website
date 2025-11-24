emailjs.init("0Xb2U08LxmtL-sARN");

export async function sendWelcomeEmail(email, name) {
  if (!email) {
    console.warn("sendWelcomeEmail skipped: email is required");
    return;
  }

  const params = {
    to_email: email,
    to_name: name || "there",
  };

  try {
    return await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", params);
  } catch (err) {
    console.error("sendWelcomeEmail failed", err);
  }
}
