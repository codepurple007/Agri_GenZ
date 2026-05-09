import i18n from "i18next";
import { initReactI18next } from "react-i18next";

function initialLng(): string {
  try {
    const a = localStorage.getItem("i18nextLng");
    if (a === "en" || a === "am" || a === "om") return a;
    const legacy = localStorage.getItem("agri_genz_locale");
    if (legacy === "en" || legacy === "am" || legacy === "om") return legacy;
  } catch {
    /* ignore */
  }
  return "am";
}

void i18n.use(initReactI18next).init({
  resources: {
    am: {
      translation: {
        appName: "አግሪ ሰርቪስ ሐብ",
        login: {
          title: "ግባ",
          subtitle:
            "ለአግሪ ሰርቪስ ማዕከል ሰራተኞች እና አስተዳዳሪዎች። የመግቢያ ሚስጥራዊ ቃል ከመለያዎ ጋር ሚናውን ይወስናል።",
          username: "የተጠቃሚ ስም",
          password: "የይለፍ ቃል",
          submit: "ግባ",
          forgot: "የይለፍ ቃል ረሳኽ?",
          staffHelp:
            "ገበሬዎች እንደ ራሳቸው አይገቡም። ክለርክ በስተቀር ለገበሬ የሚያገለግለው ስክሪን ከ«ገበሬ» ምዝገባ በኋላ ይከፈታል።",
          smsSection: "SMS ኮድ (አማራጭ ለሙከራ)",
          smsToggle: "በስልክ ቁጥር በኮድ ግባ",
          phone: "ስልክ ቁጥር",
          sendCode: "ኮድ ላክ",
          otp: "የ6 አኃዝ ኮድ",
          verify: "አረጋግጥ",
          back: "ተመለስ",
          offline:
            "ኢንተርኔት የለም። አንዳንድ ማያያዣዎች እስኪመለስ ድረስ ሊገደቡ ይችላሉ።",
          online: "መስመር ላይ ነዎት",
          demoStaff: "ሙከራ፦ clerk / demo ወይም admin / demo (የይለፍ ቃል demo) — በ mock ሁኔታ አገልጋይ አይገባም።",
          headerTagline: "የኢትዮጵያ ግብርና ድጋፍ",
          wheatAria: "ስንዴ",
          show: "አሳይ",
          hide: "ደብቅ",
          errors: {
            generic: "መግባት አልተሳካም። እንደገና ይሞክሩ።",
          },
          backHome: "መነሻ",
        },
        investor: {
          loginTitle: "የኢንቨስተር ግባ",
          loginSubtitle:
            "የተረጋገጡ ንግዶች እና ህብረተ ስራዎች ብቻ። ገንዘብ በሐብ ኢስክሮው ይቆጣጠራል።",
          badge: "በ AgriService Hub የተረጋገጠ",
          investorOnly: "የተረጋገጡ ንግዶች እና ህብረተ ስራዎች ብቻ ሊያፋፍሙ ይችላሉ።",
          demoHint:
            "የግብዣ ኢሜይል እና በማስተካከያ ገጽ የተቀየረ የይለፍ ቃል ይጠቀሙ። በድር ላይ ክፍት ምዝገባ የለም።",
          portalSubtitle: "የኢንቨስተር መግቢያ",
          navDashboard: "ዳሽቦርድ",
          navBrowse: "ፈልግ",
          navOffers: "አዋዋዮች",
          navEscrow: "ኢስክሮ",
          navProfile: "መገለጫ",
          browseTitle: "የገበሬ መገለጫዎች (ስም የለም)",
          escrowTitle: "ኢስክሮ ዋሌት",
          offersTitle: "የኢንቨስት አዋዋዮች",
        },
      },
    },
    en: {
      translation: {
        appName: "AgriService Hub",
        login: {
          title: "Sign in",
          subtitle:
            "For AgriService Center clerks and administrators. Your credentials determine your role.",
          username: "Username",
          password: "Password",
          submit: "Sign in",
          forgot: "Forgot password?",
          staffHelp:
            "Farmers do not sign in themselves. The farmer-facing clerk screen opens after you select a farmer record.",
          smsSection: "SMS code (optional demo)",
          smsToggle: "Sign in with phone OTP instead",
          phone: "Mobile number",
          sendCode: "Send code",
          otp: "6-digit code",
          verify: "Verify",
          back: "Back",
          offline: "You are offline. Some actions may be unavailable until connection returns.",
          online: "You are online",
          demoStaff: "Demo: clerk / demo or admin / demo (password demo) — no backend required in mock mode.",
          headerTagline: "Ethiopian Agricultural Support",
          wheatAria: "Wheat",
          show: "Show",
          hide: "Hide",
          errors: {
            generic: "Sign-in failed. Try again.",
          },
          backHome: "Home",
        },
        investor: {
          loginTitle: "Investor sign in",
          loginSubtitle:
            "Funds are held in AgriService Hub escrow; clerks disburse in stages. Farmers never receive investor cash directly.",
          badge: "Verified by AgriService Hub",
          investorOnly: "Only verified businesses and cooperatives may invest.",
          demoHint:
            "Use the invitation email and the password you set via your setup link. Open web registration is not available.",
          portalSubtitle: "Investor portal",
          navDashboard: "Home",
          navBrowse: "Browse",
          navOffers: "Offers",
          navEscrow: "Escrow",
          navProfile: "Profile",
          browseTitle: "Anonymised farmer profiles",
          escrowTitle: "Escrow wallet",
          offersTitle: "Your offers",
        },
      },
    },
    om: {
      translation: {
        appName: "AgriService Hub",
        login: {
          title: "Seeni",
          subtitle:
            "Meeshaalee AgriService Center fi bulchiinsaaf. Mirkaneessituun kee akkaataa kee murteessa.",
          username: "Maqaa fayyadamaa",
          password: "Jecha iccitii",
          submit: "Seeni",
          forgot: "Jecha iccitii irra darbite?",
          staffHelp:
            "Qonnaan ofuma isaanii seenaan hin jiran. Gabatee qonnaa erga tarree qonnaa filattanii booda ni banama.",
          smsSection: "SMS code (demo filannoo)",
          smsToggle: "OTP bilbilaa irratti fayyadamuu",
          phone: "Lakkoofsa bilbilaa",
          sendCode: "Ergaa ergi",
          otp: "Lakkoofsa 6 digit",
          verify: "Mirkaneessi",
          back: "Duubaatti",
          offline:
            "Interneeti hin jiru. Hojii tokko tokko yeroo walitti dhufeen deebi’uu hin danda’an.",
          online: "Interneeti irratti jirta",
          demoStaff: "Demo: clerk/demo ykn admin/demo (jecha iccitii demo) — mock irratti sarvaree hin barbaachisu.",
          headerTagline: "Gargaarsa Qonnaa Itoophiyaa",
          wheatAria: "Daabboo",
          show: "Agarsiisi",
          hide: "Dhoksi",
          errors: {
            generic: "Seenaa hin milkoofne. Irra deebi’aa yaali.",
          },
          backHome: "Mana",
        },
        investor: {
          loginTitle: "Seenaa investaraa",
          loginSubtitle:
            "Maallaqa escrow AgriService Hub keessatti kuufama; meeshaaleen yeroo walakka qoodanitti baasu. Qonnaan dirqama investaraa hin argan.",
          badge: "AgriService Hub irratti mirkanaa’e",
          investorOnly: "Daldala mirkanaa’oo fi hawaasa qunnamtii qofa invest gochuuf ni danda’u.",
          demoHint:
            "Imeelii invite fi jecha iccitii links setup keessan irratti sirreessitan fayyadami. Saajii web irratti baname hin jiru.",
          portalSubtitle: "Saajii investaraa",
          navDashboard: "Mana",
          navBrowse: "Barbaadi",
          navOffers: "Offers",
          navEscrow: "Escrow",
          navProfile: "Profaayilii",
          browseTitle: "Profaayilii qonnaa himatikaa",
          escrowTitle: "Boorsaa escrow",
          offersTitle: "Offers keessan",
        },
      },
    },
  },
  lng: typeof window !== "undefined" ? initialLng() : "am",
  fallbackLng: "am",
  interpolation: { escapeValue: false },
});

export default i18n;
