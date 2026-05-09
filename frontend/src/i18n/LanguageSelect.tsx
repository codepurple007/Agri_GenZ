import { Select, type SelectProps } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { normalizeAppLang, persistLanguage, type AppLang } from "@/i18n/locale";

const OPTIONS: { value: AppLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "am", label: "አማርኛ" },
  { value: "om", label: "Afaan Oromoo" },
];

type Props = Omit<SelectProps, "children" | "onChange" | "value">;

/** Dropdown language picker (replaces globe toggle). */
export function LanguageSelect(props: Props) {
  const { i18n: i18nApi } = useTranslation();
  const value = normalizeAppLang(i18nApi.language);

  return (
    <Select
      aria-label="Language"
      value={value}
      onChange={(e) => persistLanguage(e.target.value as AppLang)}
      {...props}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
