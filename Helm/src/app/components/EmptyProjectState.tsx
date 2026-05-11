import { Layers, Sparkles, FolderPlus, FileSpreadsheet } from 'lucide-react';

interface EmptyProjectStateProps {
  projectName: string;
  onImport: () => void;
  onCreateSection: () => void;
  onUseTemplate: () => void;
}

export function EmptyProjectState({ projectName, onImport, onCreateSection, onUseTemplate }: EmptyProjectStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_10px_25px_rgba(79,70,229,0.30)]">
          <Layers className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(245,158,11,0.4)] ring-4 ring-white">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
        {projectName} is empty
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">
        Pick a quick way to start: use a template, import a sheet, or create sections from scratch.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        <button
          onClick={onUseTemplate}
          className="group flex items-start gap-3 p-4 bg-white border border-[var(--border-soft)] rounded-2xl hover:border-indigo-300 hover:shadow-[0_8px_24px_rgba(79,70,229,0.10)] hover:-translate-y-0.5 transition-all text-left"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(79,70,229,0.30)] flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Template</p>
            <p className="text-xs text-gray-500 mt-0.5">Sheet or preset starter</p>
          </div>
        </button>

        <button
          onClick={onImport}
          className="group flex items-start gap-3 p-4 bg-white border border-[var(--border-soft)] rounded-2xl hover:border-emerald-300 hover:shadow-[0_8px_24px_rgba(16,185,129,0.10)] hover:-translate-y-0.5 transition-all text-left"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_2px_6px_rgba(16,185,129,0.30)] flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Import</p>
            <p className="text-xs text-gray-500 mt-0.5">Sheet → sections & tasks</p>
          </div>
        </button>

        <button
          onClick={onCreateSection}
          className="group flex items-start gap-3 p-4 bg-white border border-[var(--border-soft)] rounded-2xl hover:border-gray-400 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-all text-left"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-white shadow-[0_2px_6px_rgba(15,23,42,0.20)] flex-shrink-0">
            <FolderPlus className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Section</p>
            <p className="text-xs text-gray-500 mt-0.5">Create one or more</p>
          </div>
        </button>
      </div>

    </div>
  );
}
