import { functions } from "./firebase-config.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js";

export async function sendWelcomeEmail(email, name) {
  try {
    const sendWelcome = httpsCallable(functions, "sendWelcomeEmail");
    await sendWelcome({ email, name });
    console.log("sendWelcomeEmail invoked for", email, name);
  } catch (error) {
    console.error("Error calling sendWelcomeEmail function:", error);
  }
}
