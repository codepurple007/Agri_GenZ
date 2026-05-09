import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text,
  useBoolean,
  useToast,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError, apiFetch } from "@/api/client";
import { roleHome, type AuthUser } from "@/auth/types";
import { AgriServiceLogo } from "@/components/brand/AgriServiceLogo";
import { getStoredLocale } from "@/i18n/landing";
import { persistLanguage } from "@/i18n/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  type LoginUiLocale,
  agriSmsLoginCopy,
} from "@/pages/login/agriSmsLoginCopy";
import { OfflineBanner } from "./OfflineBanner";

type StaffLoginRes = {
  ok: boolean;
  token: string;
  user: AuthUser;
};

function detectLoginLocale(): LoginUiLocale {
  const s = getStoredLocale();
  if (s === "am" || s === "om" || s === "en") return s;
  return "en";
}

function KebeleLoginForm({ locale }: { locale: LoginUiLocale }) {
  const t = agriSmsLoginCopy[locale];
  const toast = useToast();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [showPass, showPassToggle] = useBoolean(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffPending, setStaffPending] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        username: z.string().min(2, t.username),
        password: z
          .string()
          .min(1, t.password)
          .refine((v) => v.length >= 8 || v === "demo", t.passwordInvalid),
      }),
    [t],
  );

  type StaffForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StaffForm>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  async function onStaffSubmit(values: StaffForm) {
    setStaffError(null);
    setStaffPending(true);
    try {
      const data = await apiFetch<StaffLoginRes>("/api/v1/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({
          username: values.username.trim(),
          password: values.password,
        }),
      });
      setSession(data.token, data.user);
      toast({ status: "success", title: t.submit });
      navigate(roleHome(data.user.role), { replace: true });
    } catch (err) {
      setStaffError(err instanceof ApiError ? err.message : t.errorsGeneric);
    } finally {
      setStaffPending(false);
    }
  }

  const showLabel = locale === "en" ? "Show" : locale === "am" ? "አሳይ" : "Agarsiisi";
  const hideLabel = locale === "en" ? "Hide" : locale === "am" ? "ደብቅ" : "Dhoksi";
  const clearLabel = locale === "en" ? "Clear form" : locale === "am" ? "መስኮት አጽዳ" : "Gabatee qulqulli";

  return (
    <>
      <Box
        bg="white"
        borderRadius="2xl"
        boxShadow="0 12px 40px rgba(27,67,50,0.08)"
        borderWidth="1px"
        borderColor="green.100"
        p={{ base: 6, md: 8 }}
      >
        <form onSubmit={handleSubmit(onStaffSubmit)} noValidate>
          <Stack spacing={5}>
            <FormControl isInvalid={!!errors.username}>
              <FormLabel htmlFor="username">{t.username}</FormLabel>
              <Input
                id="username"
                size="lg"
                autoComplete="username"
                placeholder={t.usernamePlaceholder || undefined}
                {...register("username")}
              />
              <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel htmlFor="password">{t.password}</FormLabel>
              <InputGroup size="lg">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                />
                <InputRightElement width="4.5rem" pr={1}>
                  <Button type="button" size="sm" variant="ghost" h="1.75rem" onClick={showPassToggle.toggle}>
                    {showPass ? hideLabel : showLabel}
                  </Button>
                </InputRightElement>
              </InputGroup>
              {t.passwordHint ? <FormHelperText fontSize="xs">{t.passwordHint}</FormHelperText> : null}
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            {staffError ? (
              <Text role="alert" color="red.600" fontSize="sm">
                {staffError}
              </Text>
            ) : null}

            <Button type="submit" colorScheme="green" size="lg" w="full" isLoading={staffPending} loadingText={t.submit}>
              {t.submit}
            </Button>

            {t.demoHint ? (
              <Text fontSize="xs" color="gray.600" borderTopWidth="1px" borderColor="gray.100" pt={4}>
                {t.demoHint}
              </Text>
            ) : null}
          </Stack>
        </form>
      </Box>

      <Button type="button" variant="ghost" size="sm" colorScheme="green" px={{ base: 0, md: 1 }} onClick={() => reset()}>
        {clearLabel}
      </Button>
    </>
  );
}

export function LoginPage() {
  const [locale, setLocale] = useState<LoginUiLocale>(detectLoginLocale);
  const t = agriSmsLoginCopy[locale];

  function setUiLocale(next: LoginUiLocale) {
    setLocale(next);
    persistLanguage(next);
  }

  return (
    <Flex direction="column" minH="100dvh" bg="linear-gradient(165deg, #e9f5ec 0%, #f7faf7 42%, #ffffff 100%)">
      <OfflineBanner message={t.offline} />

      <Flex
        as="header"
        align="flex-start"
        justify="space-between"
        gap={4}
        px={{ base: 4, md: 10 }}
        py={5}
        borderBottomWidth="1px"
        borderColor="blackAlpha.100"
        bg="whiteAlpha.950"
      >
        <Flex align="flex-start" gap={3} maxW="lg">
          <Box flexShrink={0} pt={0.5}>
            <AgriServiceLogo size={44} />
          </Box>
          <Heading as="div" size="md" color="brand.900" letterSpacing="-0.02em" pt={0.5}>
            {t.appName}
          </Heading>
        </Flex>
        <Stack align="flex-end" spacing={2}>
          <Flex gap={2} flexWrap="wrap" justify="flex-end">
            {(["en", "am", "om"] as const).map((lng) => (
              <Button
                key={lng}
                size="sm"
                variant={locale === lng ? "solid" : "outline"}
                colorScheme="green"
                onClick={() => setUiLocale(lng)}
                aria-pressed={locale === lng}
              >
                {lng === "en" ? "EN" : lng === "am" ? "አማ" : "Om"}
              </Button>
            ))}
          </Flex>
          <Button as={Link} to="/" variant="ghost" colorScheme="green" size="sm">
            ← {t.home}
          </Button>
        </Stack>
      </Flex>

      <Flex flex="1" align="flex-start" justify="center" px={4} py={{ base: 8, md: 12 }}>
        <Box w="full" maxW="md">
          <Stack spacing={6}>
            <Heading as="h1" size="lg" color="brand.900" mb={2}>
              {t.title}
            </Heading>

            <KebeleLoginForm key={locale} locale={locale} />
          </Stack>
        </Box>
      </Flex>
    </Flex>
  );
}
