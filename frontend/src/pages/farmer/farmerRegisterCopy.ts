import type { Locale } from "@/i18n/landing";

export type FarmerRegisterStrings = {
  title: string;
  fullName: string;
  phone: string;
  phoneHint: string;
  language: string;
  /** Regional state (Ethiopia) */
  regionState: string;
  /** District 1–9 */
  district: string;
  /** Shown under region select on small screens */
  regionHint: string;
  cropsLabel: string;
  cropWheat: string;
  cropTeff: string;
  cropMaize: string;
  cropBarley: string;
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
    regionState: "Regional state",
    district: "District",
    regionHint: "Open the list and select your regional state.",
    cropsLabel: "Crops (optional)",
    cropWheat: "Wheat",
    cropTeff: "Teff",
    cropMaize: "Maize",
    cropBarley: "Barley",
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
    regionState: "ክልል",
    district: "ወረዳ",
    regionHint: "ዝርዝሩን ክፈትና ክልልዎን ይምረጡ።",
    cropsLabel: "ሰብል (አማራጭ)",
    cropWheat: "ስንዴ",
    cropTeff: "ጤፍ",
    cropMaize: "በቆሎ",
    cropBarley: "ገብስ",
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
    regionState: "Godina (Naannoo)",
    district: "Diristiriktii",
    regionHint: "Tarree banadhu naannoo kee filadhu.",
    cropsLabel: "Midhaan (filannoo)",
    cropWheat: "Qamadii",
    cropTeff: "Taffii",
    cropMaize: "Booqqolloo",
    cropBarley: "Garbuu",
    consent: "Beeksisa SMS akka naaf dhufu nan eeyyadha.",
    submit: "Galmeessi",
    successTitle: "Galmaafte",
    backHome: "Mana",
    offline: "Interneeti hin jiru.",
  },
};
