import { Anchor, Briefcase, Settings, BookOpen, ChevronRight, LayoutDashboard, TrendingUp } from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, isActive, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className={isActive ? 'text-blue-600' : 'text-gray-500'}>
        {icon}
      </div>
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
    </button>
  );
}

export function NavigationSidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 rounded-lg">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">Helm</h1>
            <p className="text-xs text-gray-500">Command Center</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
            Workspaces
          </div>
          <div className="space-y-1">
            <SidebarItem 
              icon={<Briefcase className="w-4 h-4" />}
              label="Revenue Operations"
              isActive={true}
            />
            <SidebarItem 
              icon={<Briefcase className="w-4 h-4" />}
              label="Deal Desk"
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
            Views
          </div>
          <div className="space-y-1">
            <SidebarItem 
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
            />
            <SidebarItem 
              icon={<TrendingUp className="w-4 h-4" />}
              label="Analytics"
            />
            <SidebarItem 
              icon={<BookOpen className="w-4 h-4" />}
              label="Reports"
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <SidebarItem 
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
        />
      </div>
    </div>
  );
}