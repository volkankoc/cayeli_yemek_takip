import apiClient from "./client";
import type { ApiResponse, User } from "@/types";

export async function getUsers(): Promise<User[]> {
  const res = await apiClient.get<ApiResponse<User[]>>("/users");
  return res.data.data;
}

export async function createUser(data: { username: string; password: string; role: "admin" | "user" }): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>("/users", data);
  return res.data.data;
}

export async function updateUser(id: number, data: { username?: string; password?: string; role?: "admin" | "user"; is_active?: number }): Promise<User> {
  const res = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
  return res.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
