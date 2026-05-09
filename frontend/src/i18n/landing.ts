export type Locale = "en" | "am";

const STORAGE_KEY = "agri_genz_locale";

export function getStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "am") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export const landingCopy = {
  en: {
    appName: "Agri GenZ",
    tagline: "Extension advice, weather, markets — built for smallholder farmers.",
    chooseLanguage: "Language",
    langEnglish: "English",
    langAmharic: "አማርኛ",
    primaryCta: "Create account",
    secondaryCta: "Sign in",
    heroBadge: "Mobile-first • Works on slow networks",
    ussdTitle: "No smartphone data? Use USSD",
    ussdLead:
      "Dial the short code on any basic phone. Follow voice or menu prompts for agronomy tips and alerts — no internet required.",
    ussdStepsTitle: "How it works",
    ussdStep1: "Open the phone dialer and enter the service code (shown when your cooperative registers you).",
    ussdStep2: "Choose your language from the menu.",
    ussdStep3: "Listen to bulletins or leave a question for your extension agent.",
    ussdNote:
      "USSD codes are assigned per district or partner. Ask your kebele office or SMS welcome message for your active code.",
    offlineNote: "Tip: Bookmark this app on your smartphone for quicker access when you have coverage.",
    footer: "Agriculture Track — Hackathon",
  },
  am: {
    appName: "አግሪ ጀንዚ",
    tagline: "የአክስቴንሽን ምክር፣ የአየር ንብረት፣ የገበያ ዋጋ — ለአነስተኛ ገበሬዎች የተዘጋጀ።",
    chooseLanguage: "ቋንቋ",
    langEnglish: "English",
    langAmharic: "አማርኛ",
    primaryCta: "መለያ ይፍጠሩ",
    secondaryCta: "ግባ",
    heroBadge: "ለሞባይል የተዘጋጀ • በዝቅተኛ አውታር ቀስ ብሎ ይሰራል",
    ussdTitle: "ስማርትፎን ዳታ የለዎት? USSD ይጠቀሙ",
    ussdLead:
      "በአንድም ስልክ ላይ አጭር ኮድ ይደውሉ። የአክስቴንሽን ምክር እና ማስጠንቀቂያዎችን ያለ ኢንተርኔት ይከታተሉ።",
    ussdStepsTitle: "እንዴት ይሰራል",
    ussdStep1: "የስልክ ዳይለርን ክፈት እና የአገልግሎት ኮድ ያስገቡ (ድርጅትዎ ሲመዘገብ የሚታይልዎትን)።",
    ussdStep2: "ከምናሌው ቋንቋዎን ይምረጡ።",
    ussdStep3: "መመሪያዎችን ያዳምጡ ወይም ለአክስቴንሽን ለእርስዎ ጥያቄ ይተው።",
    ussdNote:
      "የUSSD ኮዶች በዲስትሪክት ወይም አጋር ይለያያሉ። የእርስዎን ንቁ ኮድ ከኬበሌ ቢሮ ወይም ከSMS እንኳን ደህና መጡ መልዕክት ይጠይቁ።",
    offlineNote: "ምክር፣ በስማርትፎን ላይ ይህን መተግበሪያ ይለምኑ ሲኖርዎት ይፈጥናል።",
    footer: "አግሪካልቸር ትራክ — ሃካቶን",
  },
} as const;
