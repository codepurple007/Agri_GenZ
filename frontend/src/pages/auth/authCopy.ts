import type { Locale } from "@/i18n/landing";

export function authCopy(locale: Locale) {
  const en = locale === "en";
  return {
    registerTitle: en ? "Create account" : "መለያ ይፍጠሩ",
    loginTitle: en ? "Sign in" : "ግባ",
    phoneLabel: en ? "Mobile number" : "የሞባይል ቁጥር",
    phoneHint: en ? "Example: 0912345678 or +251912345678" : "ምሳሌ፦ 0912345678 ወይም +251912345678",
    fullName: en ? "Full name" : "ሙሉ ስም",
    roleLabel: en ? "Your role" : "የእርስዎ ሚና",
    roleFarmer: en ? "Farmer" : "ገበሬ",
    roleAgent: en ? "Extension agent" : "የአክስቴንሽን ወኪል",
    roleAdmin: en ? "District admin" : "የዲስትሪክት አስተዳዳሪ",
    sendCode: en ? "Send SMS code" : "SMS ኮድ ላክ",
    verify: en ? "Verify & continue" : "አረጋግጥ እና ቀጥል",
    otpLabel: en ? "6-digit code" : "የ6 አኃዝ ኮድ",
    otpHint: en ? "Enter the code we sent by SMS." : "በSMS የተላከውን ኮድ ያስገቡ።",
    back: en ? "Back" : "ተመለስ",
    hasAccount: en ? "Already have an account?" : "አስቀድሞ መለያ አለዎት?",
    noAccount: en ? "New here?" : "አዲስ ነዎት?",
    devOtp: en ? "Dev OTP (backend console)" : "Dev OTP (የሰርቨር ሎግ)",
    loginSend: en ? "Send login code" : "የመግባት ኮድ ላክ",
    loginVerify: en ? "Verify & enter app" : "አረጋግጥ እና ይግቡ",
    homeLink: en ? "Home" : "መነሻ",
  };
}
