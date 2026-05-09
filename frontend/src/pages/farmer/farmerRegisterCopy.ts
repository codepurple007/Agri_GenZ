import type { Locale } from "@/i18n/landing";

export type FarmerRegisterStrings = {
  title: string;
  fullName: string;
  phone: string;
  phoneHint: string;
  language: string;
  village: string;
  consent: string;
  submit: string;
  successTitle: string;
  backHome: string;
  offline: string;
};

export const farmerRegisterCopy: Record<Locale, FarmerRegisterStrings> = {
  en: {
    title: "SMS registration",
    fullName: "Full name",
    phone: "Phone",
    phoneHint: "09XXXXXXXX",
    language: "Language",
    village: "Village",
    consent: "I agree to receive SMS alerts.",
    submit: "Register",
    successTitle: "Registered",
    backHome: "Home",
    offline: "Offline.",
  },
  am: {
    title: "SMS ምዝገባ",
    fullName: "ሙሉ ስም",
    phone: "ስልክ",
    phoneHint: "09XXXXXXXX",
    language: "ቋንቋ",
    village: "ቀበሌ",
    consent: "ኤስኤምኤስ ማስጠንቀቂያ እንድቀበል እስማማለሁ።",
    submit: "መዝገብ",
    successTitle: "ተመዝገበዋል",
    backHome: "መነሻ",
    offline: "ኦፍላይን።",
  },
  om: {
    title: "Galmaa'ina SMS",
    fullName: "Maqaa guutuu",
    phone: "Bilbilaa",
    phoneHint: "09XXXXXXXX",
    language: "Afaan",
    village: "Ganda",
    consent: "Beeksisa SMS akka naaf dhufu nan eeyyadha.",
    submit: "Galmeessi",
    successTitle: "Galmaafte",
    backHome: "Mana",
    offline: "Interneeti hin jiru.",
  },
};
