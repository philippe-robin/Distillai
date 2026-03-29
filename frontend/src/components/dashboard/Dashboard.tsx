import { useState } from "react";
import { Plus, Search, FolderOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { ProjectCard } from "./ProjectCard";
import { SimulationList } from "./SimulationList";
import * as projectsApi from "@/api/projects";
import type { Project } from "@/types/api";

export function Dashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects", search],
    queryFn: () => projectsApi.listProjects({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowNewProject(false);
      setNewProjectName("");
      setNewProjectDescription("");
    },
  });

  const projects = projectsData?.items ?? [];

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
    });
  };

  // If a project is selected, show its simulations
  if (selectedProject) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => setSelectedProject(null)}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Projects
            </button>
            <span className="text-text-secondary">/</span>
            <h1 className="text-lg font-semibold text-text-primary">
              {selectedProject.name}
            </h1>
          </div>

          <SimulationList projectId={selectedProject.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">My Projects</h1>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => setShowNewProject(true)}
          >
            New Project
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Project grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreateClick={() => setShowNewProject(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProject(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        title="Create New Project"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">Project Name</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g., Pipe Flow Analysis"
              className="input-field"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
              }}
            />
          </div>
          <div>
            <label className="input-label">Description (optional)</label>
            <textarea
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNewProject(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateProject}
              isLoading={createMutation.isPending}
              disabled={!newProjectName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <FolderOpen size={32} className="text-text-secondary" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-text-primary">
        No projects yet
      </h3>
      <p className="mb-4 text-sm text-text-secondary">
        Create your first CFD simulation project
      </p>
      <Button
        variant="primary"
        size="md"
        icon={<Plus size={16} />}
        onClick={onCreateClick}
      >
        New Project
      </Button>
    </div>
  );
}
