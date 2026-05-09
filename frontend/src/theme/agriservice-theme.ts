import { extendTheme } from "@chakra-ui/react";

/** Mobile-first tokens aligned with AgriService Hub Frontend Spec §2–§3 (WCAG-oriented greens). */
export const agriserviceTheme = extendTheme({
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
      50: "#edf7f0",
      100: "#d8f3dc",
      200: "#b7e4c7",
      300: "#95d5b2",
      400: "#74c69d",
      500: "#52b788",
      600: "#40916c",
      700: "#2d6a4f",
      800: "#1b4332",
      900: "#081c15",
    },
  },
  semanticTokens: {
    colors: {
      "chakra-body-text": { default: "#1a2e1a" },
      "chakra-body-bg": { default: "#f4f7f4" },
    },
  },
  styles: {
    global: {
      body: {
        bg: "chakra-body-bg",
        color: "chakra-body-text",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "semibold",
      },
      sizes: {
        lg: {
          minH: "48px",
          px: 6,
          fontSize: "md",
        },
      },
      variants: {
        solid: {
          bg: "brand.800",
          color: "white",
          _hover: { bg: "brand.700" },
        },
      },
    },
    Input: {
      sizes: {
        lg: {
          field: {
            minH: "48px",
          },
        },
      },
    },
  },
});
