import client from "./client";
import type {
  Simulation,
  SimulationCreate,
  SimulationUpdate,
  TaskResponse,
} from "@/types/api";

export async function listSimulations(params?: {
  project_id?: string;
  status?: string;
}): Promise<Simulation[]> {
  const { data } = await client.get<Simulation[]>("/simulations", { params });
  return data;
}

export async function createSimulation(
  payload: SimulationCreate,
): Promise<Simulation> {
  const { data } = await client.post<Simulation>("/simulations", payload);
  return data;
}

export async function getSimulation(id: string): Promise<Simulation> {
  const { data } = await client.get<Simulation>(`/simulations/${id}`);
  return data;
}

export async function updateSimulation(
  id: string,
  payload: SimulationUpdate,
): Promise<Simulation> {
  const { data } = await client.patch<Simulation>(
    `/simulations/${id}`,
    payload,
  );
  return data;
}

export async function launchSimulation(id: string): Promise<TaskResponse> {
  const { data } = await client.post<TaskResponse>(
    `/simulations/${id}/launch`,
  );
  return data;
}

export async function cancelSimulation(
  id: string,
): Promise<{ status: string }> {
  const { data } = await client.post<{ status: string }>(
    `/simulations/${id}/cancel`,
  );
  return data;
}
