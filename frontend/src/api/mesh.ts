import client from "./client";
import type { Mesh, MeshGenerateRequest, TaskResponse } from "@/types/api";

export async function generateMesh(
  simulationId: string,
  params: MeshGenerateRequest,
): Promise<TaskResponse> {
  const { data } = await client.post<TaskResponse>("/mesh/generate", {
    simulation_id: simulationId,
    element_size: params.element_size,
    refinement_zones: params.refinement_zones ?? [],
  });
  return data;
}

export async function getMesh(simulationId: string): Promise<Mesh> {
  const { data } = await client.get<Mesh>(`/mesh/${simulationId}`);
  return data;
}

export async function downloadMesh(simulationId: string): Promise<Blob> {
  const { data } = await client.get<Blob>(`/mesh/${simulationId}/download`, {
    responseType: "blob",
  });
  return data;
}

export async function getMeshPreview(simulationId: string): Promise<Blob> {
  const { data } = await client.get<Blob>(`/mesh/${simulationId}/preview`, {
    responseType: "blob",
  });
  return data;
}
