import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { StatusBadge } from "@/components/common/StatusBadge";
import * as simApi from "@/api/simulations";
import { SimulationType, type SimulationStatus } from "@/types/api";
import { SIMULATION_TYPES } from "@/lib/constants";

interface SimulationListProps {
  projectId: string;
}

export function SimulationList({ projectId }: SimulationListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SimulationType>(
    SimulationType.InternalFlow,
  );

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ["simulations", projectId],
    queryFn: () => simApi.listSimulations({ project_id: projectId }),
  });

  const createMutation = useMutation({
    mutationFn: simApi.createSimulation,
    onSuccess: (sim) => {
      queryClient.invalidateQueries({ queryKey: ["simulations", projectId] });
      setShowNew(false);
      setNewName("");
      navigate(`/workspace/${sim.id}`);
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      project_id: projectId,
      simulation_type: newType,
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          Simulations
        </h2>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setShowNew(true)}
        >
          New Simulation
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : simulations.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-secondary py-10 text-center">
          <p className="text-sm text-text-secondary">No simulations yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {simulations.map((sim) => (
                <tr
                  key={sim.id}
                  onClick={() => navigate(`/workspace/${sim.id}`)}
                  className="cursor-pointer bg-bg-secondary transition-colors hover:bg-bg-tertiary"
                >
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {sim.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {SIMULATION_TYPES[sim.simulation_type]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sim.status as SimulationStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(sim.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Simulation Modal */}
      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="New Simulation"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">Simulation Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Baseline Run"
              className="input-field"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <div>
            <label className="input-label">Simulation Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as SimulationType)}
              className="input-field"
            >
              {Object.entries(SIMULATION_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNew(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              isLoading={createMutation.isPending}
              disabled={!newName.trim()}
            >
              Create & Open
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
