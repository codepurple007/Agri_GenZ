export type LoginUiLocale = "en" | "am" | "om";

export type AgriSmsLoginStrings = {
  appName: string;
  title: string;
  username: string;
  usernamePlaceholder: string;
  password: string;
  passwordHint: string;
  submit: string;
  home: string;
  offline: string;
  demoHint: string;
  errorsGeneric: string;
  passwordInvalid: string;
};

export const agriSmsLoginCopy: Record<LoginUiLocale, AgriSmsLoginStrings> = {
  en: {
    appName: "AgriSMS",
    title: "Sign in",
    username: "Username",
    usernamePlaceholder: "",
    password: "Password",
    passwordHint: "Minimum 8 characters, or demo",
    submit: "Sign in",
    home: "Home",
    offline: "Offline.",
    demoHint: "Demo: kebele / demo",
    errorsGeneric: "Sign-in failed.",
    passwordInvalid: "Minimum 8 characters, or demo",
  },
  am: {
    appName: "AgriSMS",
    title: "ግባ",
    username: "ተጠቃሚ ስም",
    usernamePlaceholder: "",
    password: "የይለፍ ቃል",
    passwordHint: "ቢያንስ 8 ወይም demo",
    submit: "ግባ",
    home: "መነሻ",
    offline: "ኦፍላይን።",
    demoHint: "ሙከራ፦ kebele / demo",
    errorsGeneric: "መግባት አልተቻለም።",
    passwordInvalid: "ቢያንስ 8 ወይም demo።",
  },
  om: {
    appName: "AgriSMS",
    title: "Seeni",
    username: "Maqaa fayyadamaa",
    usernamePlaceholder: "",
    password: "Jecha iccitii",
    passwordHint: "Yoo xiqqaate 8 ykn demo",
    submit: "Seeni",
    home: "Mana",
    offline: "Interneeti hin jiru.",
    demoHint: "Demo: kebele / demo",
    errorsGeneric: "Seenanni hin milkoofne.",
    passwordInvalid: "Yoo xiqqaate 8 ykn demo.",
  },
};
