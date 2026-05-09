import { Box, Button, Flex, Heading, HStack, Link, Text, StackDivider } from "@chakra-ui/react";
import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { AgriServiceLogo } from "@/components/brand/AgriServiceLogo";
import { useAuth } from "@/hooks/useAuth";

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <Flex direction="column" minH="100dvh" bg="gray.50">
      <Flex
        as="header"
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={3}
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
            <Heading size="sm" color="cyan.900" fontWeight="800">
              Super Administrator
            </Heading>
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {user?.fullName ?? "—"}
            </Text>
          </Box>
        </Flex>
        <HStack divider={<StackDivider />} spacing={4} justify="flex-end" flexWrap="wrap">
          <Link as={RouterLink} to="/superadmin/staff" fontWeight="medium" fontSize="sm" color="cyan.700">
            Staff accounts
          </Link>
          <Link as={RouterLink} to="/superadmin/voice-ussd" fontWeight="medium" fontSize="sm" color="cyan.700">
            USSD voice release
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
      <Box as="main" flex={1} p={{ base: 4, md: 8 }} maxW="1080px" mx="auto" w="full">
        <Outlet />
      </Box>
    </Flex>
  );
}
