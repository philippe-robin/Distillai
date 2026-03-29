import client from "./client";
import type { Geometry } from "@/types/api";

export async function uploadGeometry(
  file: File,
  simulationId: string,
): Promise<Geometry> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("simulation_id", simulationId);

  const { data } = await client.post<Geometry>("/geometry/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getGeometry(geometryId: string): Promise<Geometry> {
  const { data } = await client.get<Geometry>(`/geometry/${geometryId}`);
  return data;
}

export async function getGeometryBySimulation(simulationId: string): Promise<Geometry> {
  const { data } = await client.get<Geometry>(`/geometry/by-simulation/${simulationId}`);
  return data;
}

export async function downloadGeometry(id: string): Promise<Blob> {
  const { data } = await client.get<Blob>(`/geometry/${id}/download`, {
    responseType: "blob",
  });
  return data;
}
