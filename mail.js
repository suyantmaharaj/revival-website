emailjs.init("0Xb2U08LxmtL-sARN");

export async function sendWelcomeEmail(email, name) {
  if (!email) {
    console.warn("sendWelcomeEmail skipped: email is required");
    return;
  }

  const params = {
    to_email: email,
    name: name || "there",
  };

  try {
    return await emailjs.send("service_onoip14", "template_9urh7za", params);
  } catch (err) {
    console.error("sendWelcomeEmail failed", err);
  }
}
