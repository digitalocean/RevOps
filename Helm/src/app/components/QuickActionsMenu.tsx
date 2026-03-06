import { Plus, FileText, Users, Target, Calendar, MessageSquare, Upload } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from './ui/dropdown-menu';

interface QuickActionsMenuProps {
  onAddInitiative?: () => void;
  onAddTeamMember?: () => void;
}

export function QuickActionsMenu({ onAddInitiative, onAddTeamMember }: QuickActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" />
          Quick Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[60]" sideOffset={8}>
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onSelect={() => onAddInitiative?.()}
        >
          <Target className="w-4 h-4" />
          New Initiative
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          New Report
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Calendar className="w-4 h-4" />
          Schedule Meeting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <MessageSquare className="w-4 h-4" />
          Send Update
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          Import Data
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onSelect={() => onAddTeamMember?.()}
        >
          <Users className="w-4 h-4" />
          Add Team Member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
