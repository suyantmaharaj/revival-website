// Initialize EmailJS with the provided public key
emailjs.init("0Xb2U08LxmtL-sARN");

export async function sendOtpEmail(email, name, otpCode) {
  if (!email) {
    console.warn("sendOtpEmail called without an email address");
    return;
  }

  const params = {
    to_email: email,
    name: name || "there",
    otp_code: otpCode,
  };

  try {
    const result = await emailjs.send(
      "service_onoip14",
      "template_xse8zll",
      params
    );
    console.log("OTP email sent", result.status);
  } catch (error) {
    console.error("Error sending OTP email", error);
    throw error;
  }
}
