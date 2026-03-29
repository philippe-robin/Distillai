import { FolderOpen, Activity } from "lucide-react";
import { Card } from "@/components/common/Card";
import type { Project } from "@/types/api";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const timeAgo = getRelativeTime(project.updated_at);

  return (
    <Card hover onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <FolderOpen size={20} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {project.name}
          </h3>
          {project.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <Activity size={12} />
          <span>
            {project.simulation_count}{" "}
            {project.simulation_count === 1 ? "simulation" : "simulations"}
          </span>
        </div>
        <span className="text-xs text-text-secondary">{timeAgo}</span>
      </div>
    </Card>
  );
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
