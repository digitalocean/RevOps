import { Plus, Upload, Layers, Sparkles } from 'lucide-react';

interface EmptyProjectStateProps {
  projectName: string;
  onAddTask: () => void;
  onImport: () => void;
  onCreateSection: () => void;
  onUseTemplate: () => void;
}

const QUICK_STARTS = [
  { icon: '📋', label: 'Add your first task', action: 'add' },
  { icon: '📊', label: 'Import from spreadsheet', action: 'import' },
  { icon: '🗂️', label: 'Create a section', action: 'section' },
  { icon: '✨', label: 'Use a template', action: 'template' },
];

export function EmptyProjectState({ projectName, onAddTask, onImport, onCreateSection, onUseTemplate }: EmptyProjectStateProps) {
  const handleAction = (action: string) => {
    if (action === 'add') onAddTask();
    else if (action === 'import') onImport();
    else if (action === 'section') onCreateSection();
    else if (action === 'template') onUseTemplate();
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Illustration */}
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
        This project has no tasks yet. Start by adding tasks, importing from a spreadsheet, or using a template.
      </p>

      {/* Quick start grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        <button
          onClick={onAddTask}
          className="flex items-center gap-3 p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-left"
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Add task</p>
            <p className="text-xs text-indigo-200">Create first task</p>
          </div>
        </button>

        <button
          onClick={onUseTemplate}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left"
        >
          <span className="text-xl">✨</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Template</p>
            <p className="text-xs text-gray-500">Use a preset</p>
          </div>
        </button>

        <button
          onClick={onImport}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left"
        >
          <Upload className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Import</p>
            <p className="text-xs text-gray-500">CSV or Sheets</p>
          </div>
        </button>

        <button
          onClick={onCreateSection}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-xl">🗂️</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Section</p>
            <p className="text-xs text-gray-500">Group tasks</p>
          </div>
        </button>
      </div>
    </div>
  );
}
