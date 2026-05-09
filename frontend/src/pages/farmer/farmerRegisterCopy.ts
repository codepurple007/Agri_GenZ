import type { Locale } from "@/i18n/landing";

export type FarmerRegisterStrings = {
  title: string;
  fullName: string;
  phone: string;
  phoneHint: string;
  language: string;
  /** Kebele unit (1–4), shown in UI language */
  kebele: string;
  /** District 1–5 */
  district: string;
  kebeleHint: string;
  districtHint: string;
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
    kebele: "Kebele",
    district: "District",
    kebeleHint: "Open the list and choose Kebele 1, 2, or 3.",
    districtHint: "Open the list and choose District 1–5.",
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
    kebele: "ቀበሌ",
    district: "ወረዳ",
    kebeleHint: "ዝርዝሩን ክፈት እና ቀበሌ ፩፣ ፪ ወይም ፫ ይምረጡ።",
    districtHint: "ዝርዝሩን ክፈት እና ከ ፩–፭ ወረዳ ይምረጡ።",
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
    kebele: "Ganda",
    district: "Diristiriktii",
    kebeleHint: "Tarree banadhu Ganda 1, 2 ykn 3 filadhu.",
    districtHint: "Tarree banadhu Diristiriktii 1 hanga 5 filadhu.",
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
