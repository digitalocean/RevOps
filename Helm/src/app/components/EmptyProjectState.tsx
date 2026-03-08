import { Upload, Layers, Sparkles } from 'lucide-react';

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
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center shadow-inner">
          <Layers className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {projectName} is empty
      </h3>
      <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
        Import a sheet, use a template, or create sections to get started.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md">
        <button
          onClick={onUseTemplate}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left"
        >
          <span className="text-xl">✨</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Template</p>
            <p className="text-xs text-gray-500">Upload sheet or use preset</p>
          </div>
        </button>

        <button
          onClick={onImport}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left"
        >
          <Upload className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Import</p>
            <p className="text-xs text-gray-500">Sheet → sections & tasks</p>
          </div>
        </button>

        <button
          onClick={onCreateSection}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-xl">🗂️</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Section</p>
            <p className="text-xs text-gray-500">Create one or more</p>
          </div>
        </button>
      </div>
    </div>
  );
}
