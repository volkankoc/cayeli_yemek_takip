import apiClient from "./client";
import type { ApiResponse, LoginRequest, LoginResponse, User } from "@/types";

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>("/auth/login", data);
  return res.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>("/auth/me");
  return res.data.data;
}
