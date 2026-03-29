import client from "./client";
import type { TokenResponse, UserResponse } from "@/types/api";

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>("/auth/register", {
    email,
    password,
    full_name: fullName,
  });
  return data;
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await client.get<UserResponse>("/auth/me");
  return data;
}
