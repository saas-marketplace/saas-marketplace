"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AccessRemovedScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new consolidated verify-access page
    router.replace("/verify-access");
  }, [router]);

  return null;
}
