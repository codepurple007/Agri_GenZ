import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Link,
  StackDivider,
  Text,
} from "@chakra-ui/react";
import { Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { AgriServiceLogo } from "@/components/brand/AgriServiceLogo";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { to: "/kebele/farmers", label: "Farmers" },
  { to: "/kebele/advisory", label: "Advisory" },
  { to: "/kebele/broadcast", label: "Broadcast" },
] as const;

export function KebeleLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <Flex direction="column" minH="100dvh" bg="gray.50">
      <Flex
        as="header"
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={{ base: 3, md: 4 }}
        px={{ base: 4, md: 6, lg: 8 }}
        py={{ base: 3, md: 3 }}
        flexDirection={{ base: "column", md: "row" }}
        borderBottomWidth="1px"
        borderColor="gray.200"
        bg="white"
        boxShadow="0 1px 0 rgba(8, 28, 21, 0.06)"
        position="sticky"
        top={0}
        zIndex={20}
      >
        <Flex align="center" gap={3} minW={0} flexShrink={0}>
          <Box
            flexShrink={0}
            borderRadius="lg"
            overflow="hidden"
            boxShadow="0 1px 3px rgba(27, 67, 50, 0.12)"
          >
            <AgriServiceLogo size={40} />
          </Box>
          <Box minW={0}>
            <Heading
              as="h1"
              size="sm"
              color="brand.900"
              fontWeight="800"
              letterSpacing="-0.03em"
              lineHeight="1.2"
            >
              AgriSMS
            </Heading>
            <Text fontSize="xs" color="gray.500" noOfLines={1} letterSpacing="0.01em">
              {user?.fullName ?? "—"}
            </Text>
          </Box>
        </Flex>

        <Flex
          align="center"
          justify={{ base: "stretch", md: "flex-end" }}
          gap={{ base: 3, md: 4 }}
          flex={1}
          minW={0}
          flexWrap="wrap"
        >
          <HStack
            spacing={0}
            align="stretch"
            bg="gray.100"
            p="3px"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            w={{ base: "100%", md: "auto" }}
            role="tablist"
            aria-label="Main"
          >
            {nav.map(({ to, label }) => {
              const active =
                to === "/kebele/broadcast"
                  ? pathname.startsWith("/kebele/broadcast")
                  : pathname === to;
              return (
                <Link
                  key={to}
                  as={RouterLink}
                  to={to}
                  role="tab"
                  aria-current={active ? "page" : undefined}
                  flex={{ base: 1, md: "initial" }}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  px={{ base: 2, sm: 4 }}
                  py={2.5}
                  minH="44px"
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="semibold"
                  whiteSpace="nowrap"
                  textDecoration="none"
                  color={active ? "brand.900" : "gray.600"}
                  bg={active ? "white" : "transparent"}
                  boxShadow={active ? "0 1px 3px rgba(8, 28, 21, 0.1)" : "none"}
                  borderWidth={active ? "1px" : "0"}
                  borderColor="blackAlpha.50"
                  transition="background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease"
                  _hover={{
                    textDecoration: "none",
                    color: "brand.800",
                    bg: active ? "white" : "blackAlpha.50",
                  }}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: "brand.500",
                    outlineOffset: "2px",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </HStack>

          <HStack
            spacing={0}
            align="center"
            divider={<StackDivider borderColor="gray.200" />}
            flexShrink={0}
            justify={{ base: "flex-end", md: "flex-start" }}
            w={{ base: "100%", md: "auto" }}
          >
            <Link
              as={RouterLink}
              to="/"
              px={3}
              py={2}
              minH="40px"
              display="inline-flex"
              alignItems="center"
              fontSize="sm"
              fontWeight="medium"
              color="gray.600"
              borderRadius="md"
              _hover={{ color: "brand.800", textDecoration: "none", bg: "gray.50" }}
              _focusVisible={{ outline: "2px solid", outlineColor: "brand.500", outlineOffset: "2px" }}
            >
              Home
            </Link>
            <Button
              variant="ghost"
              size="sm"
              fontWeight="medium"
              color="red.600"
              _hover={{ bg: "red.50", color: "red.700" }}
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Log out
            </Button>
          </HStack>
        </Flex>
      </Flex>

      <Box as="main" flex="1" p={{ base: 4, md: 8 }} maxW="1200px" mx="auto" w="full">
        <Outlet />
      </Box>
    </Flex>
  );
}
