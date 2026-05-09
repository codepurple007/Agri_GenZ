import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Link,
  Text,
  StackDivider,
} from "@chakra-ui/react";
import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { AgriServiceLogo } from "@/components/brand/AgriServiceLogo";
import { useAuth } from "@/hooks/useAuth";

export function VoiceRecorderLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <Flex direction="column" minH="100dvh" bg="gray.50">
      <Flex
        as="header"
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={{ base: 3, md: 4 }}
        px={{ base: 4, md: 6 }}
        py={3}
        flexDirection={{ base: "column", md: "row" }}
        borderBottomWidth="1px"
        borderColor="gray.200"
        bg="white"
      >
        <Flex align="center" gap={3}>
          <Box borderRadius="lg" overflow="hidden">
            <AgriServiceLogo size={40} />
          </Box>
          <Box>
            <Heading size="sm" color="purple.900" fontWeight="800">
              Voice advisory (USSD / IVR demo)
            </Heading>
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {user?.fullName ?? "—"}
            </Text>
          </Box>
        </Flex>
        <HStack
          divider={<StackDivider />}
          spacing={4}
          flexWrap="wrap"
          justify={{ base: "stretch", md: "flex-end" }}
        >
          <Link as={RouterLink} to="/voice-recorder" fontWeight="medium" fontSize="sm" color="purple.700">
            Jobs list
          </Link>
          <Link as={RouterLink} to="/" fontSize="sm" color="gray.600">
            Home
          </Link>
          <Button
            variant="ghost"
            size="sm"
            color="red.600"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </Button>
        </HStack>
      </Flex>
      <Box as="main" flex={1} p={{ base: 4, md: 8 }} maxW="960px" mx="auto" w="full">
        <Outlet />
      </Box>
    </Flex>
  );
}
