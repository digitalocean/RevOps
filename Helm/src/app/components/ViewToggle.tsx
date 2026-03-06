import { LayoutGrid, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";

interface ViewToggleProps {
  viewMode: "grid" | "gantt";
  onViewChange: (mode: "grid" | "gantt") => void;
}

export function ViewToggle({
  viewMode,
  onViewChange,
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("grid")}
        className={`gap-2 transition-colors ${
          viewMode === "grid"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="font-medium">Grid</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("gantt")}
        className={`gap-2 transition-colors ${
          viewMode === "gantt"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <BarChart3 className="w-4 h-4" />
        <span className="font-medium">Gantt</span>
      </Button>
    </div>
  );
}