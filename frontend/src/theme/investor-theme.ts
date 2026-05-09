import { extendTheme } from "@chakra-ui/react";

/** Investor portal — purple differentiation (Frontend Investor Addendum §A). */
export const investorTheme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
  fonts: {
    heading:
      "'Noto Sans Ethiopic','DM Sans','Segoe UI',system-ui,sans-serif",
    body: "'Noto Sans Ethiopic','DM Sans','Segoe UI',system-ui,sans-serif",
  },
  colors: {
    brand: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea",
      700: "#7e22ce",
      800: "#6b21a8",
      900: "#581c87",
    },
  },
  components: {
    Button: {
      sizes: {
        lg: { minH: "48px" },
      },
      variants: {
        solid: {
          bg: "brand.700",
          color: "white",
          _hover: { bg: "brand.800" },
        },
      },
    },
  },
});
