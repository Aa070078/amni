"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/src/lib/api";

export interface MeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: string;
  isEmailVerified: boolean;
  isPlatformAdmin: boolean;
}

export function useMe() {
  const router = useRouter();

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const data = await api<{ data: { user: MeUser } }>("/auth/me");
        return data.data.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}
