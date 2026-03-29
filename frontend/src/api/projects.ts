import client from "./client";
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  PaginatedResponse,
} from "@/types/api";

export async function listProjects(params?: {
  workspace_id?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Project>> {
  const { data } = await client.get<PaginatedResponse<Project>>("/projects", {
    params,
  });
  return data;
}

export async function createProject(payload: ProjectCreate): Promise<Project> {
  const { data } = await client.post<Project>("/projects", payload);
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await client.get<Project>(`/projects/${id}`);
  return data;
}

export async function updateProject(
  id: string,
  payload: ProjectUpdate,
): Promise<Project> {
  const { data } = await client.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await client.delete(`/projects/${id}`);
}
