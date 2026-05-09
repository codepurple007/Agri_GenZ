export type Locale = "en" | "am" | "om";

const STORAGE_KEY = "agri_genz_locale";

export function getStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "am" || v === "om") return v;
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
    langOromoo: "Afaan Oromoo",
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
    ussdGovNote:
      "Voice bulletins on USSD (for example after dialing *850#) are staged by your cooperative, checked by recorder staff, then released by administrators—matching the agronomy prompts you chose at registration.",
    demoUssdCode: "*850#",
    offlineNote: "Tip: Bookmark this app on your smartphone for quicker access when you have coverage.",
    footer: "Agriculture Track — Hackathon",
    ussdCodeHintSuffix: " — ask your service provider for the active code.",
    smsRegisterCta: "SMS signup",
  },
  am: {
    appName: "አግሪ ጀንዚ",
    tagline: "የአክስቴንሽን ምክር፣ የአየር ንብረት፣ የገበያ ዋጋ — ለአነስተኛ ገበሬዎች የተዘጋጀ።",
    chooseLanguage: "ቋንቋ",
    langEnglish: "English",
    langAmharic: "አማርኛ",
    langOromoo: "Afaan Oromoo",
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
    ussdGovNote:
      "የድምፅ አማተዮች በUSSD ላይ (ለምሳል *850# በመደውል) በተባባሪነት እንዲዘጋጅ፣ በቅጂ ሰጪዎች እንዲፈተሽ፣ ከዚያ በአስተዳዳሪዎች እንዲለቀቁ ይሰፋሉ።",
    demoUssdCode: "*850#",
    offlineNote: "ምክር፣ በስማርትፎን ላይ ይህን መተግበሪያ ይለምኑ ሲኖርዎት ይፈጥናል።",
    footer: "አግሪካልቸር ትራክ — ሃካቶን",
    ussdCodeHintSuffix: " — የምርጫ ኮድ አብነት ከአገልግሎት አቅራቢዎ ይጠይቁ።",
    smsRegisterCta: "SMS ይመዝገቡ",
  },
  om: {
    appName: "Agri GenZ",
    tagline:
      "Gargaarsa bal’inaa, haala qilleensaa, gabaa — qonnaa xixiqqoo irratti kan qophaa’e.",
    chooseLanguage: "Afaan",
    langEnglish: "English",
    langAmharic: "አማርኛ",
    langOromoo: "Afaan Oromoo",
    primaryCta: "Akkaawuntii uumi",
    secondaryCta: "Seeni",
    heroBadge: "Mobayilaaf kan qophaa’e • Interneeti suuta irratti hojjeta",
    ussdTitle: "Daataa smartfoonii hin qabduu? USSD fayyadami",
    ussdLead:
      "Lakkoofsa gabaabaa bilbila kamillee irratti bilbilaa. Gargaarsa qonnaa fi beeksisa dhageeffadhaa — interneeti hin barbaachisu.",
    ussdStepsTitle: "Akkamitti hojjeta",
    ussdStep1:
      "Diilaayira bilbilaa banuu fi lakkoofsa tajaajilaa galchuu (yeroo hawaasa keessan akkaawuntii galchu godhu ilaaluu).",
    ussdStep2: "Mana baafata irraa afaan keessan filadhaa.",
    ussdStep3: "Beeksisa dhageeffadhaa ykn gargaara bal’inaa irratti gaaffii galchaa.",
    ussdNote:
      "Lakkoofsi USSD naannoo ykn partner hundaaf adda addaa dha. Lakkoofsa ammaa keessan mana keebbalee ykn ergaa SMS bilisa dhufe irraa gaafadhaa.",
    ussdGovNote:
      "Beeksisni sagalee USSD irratti (*850# fayyadamuu fakkeenyaaf) hawwii dhaabbataa, qaama rekoodarrii, yeroo isaaniis bulchitoota’n ni milkaa’ina akka qabaatu — wa’ee agronomii filatameef wal qabata.",
    demoUssdCode: "*850#",
    offlineNote: "Gorsa: Yeroo interneeti qabdan app kana smartfoonii irratti bookmark godhaa.",
    footer: "Agriculture Track — Hackathon",
    ussdCodeHintSuffix: " — lakkoofsa ammaa dhaabbata tajaajila irraa gaafadhaa.",
    smsRegisterCta: "Galmaa'ina SMS",
  },
} as const;
