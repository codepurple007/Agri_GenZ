import { Alert, AlertIcon } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Props = { message: string };

export function OfflineBanner({ message }: Props) {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <Alert status="warning" variant="solid" borderRadius="0" py={3} px={{ base: 4, md: 6 }}>
      <AlertIcon />
      {message}
    </Alert>
  );
}
