"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccessRestoredRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new consolidated verify-access page
    router.replace("/verify-access");
  }, [router]);

  return null;
}
