import { useState } from 'react';
import { X, Calendar, User, Tag, Flag, MessageSquare, Paperclip, Clock, CheckSquare, Star, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import type { Initiative } from '../data/mockData';

interface InitiativeDetailsDialogProps {
  initiative: Initiative;
  onClose: () => void;
}

interface Comment {
  id: string;
  user: string;
  userInitials: string;
  message: string;
  timestamp: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

const mockComments: Comment[] = [
  {
    id: '1',
    user: 'Sarah Chen',
    userInitials: 'SC',
    message: 'API integration testing is progressing well. We should be ready for the next phase by end of week.',
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    user: 'Marcus Rodriguez',
    userInitials: 'MR',
    message: 'Great work team! Let me know if you need any additional resources.',
    timestamp: '5 hours ago'
  }
];

const mockSubtasks: Subtask[] = [
  { id: '1', title: 'Complete API documentation', completed: true, assignee: 'Sarah Chen' },
  { id: '2', title: 'Setup staging environment', completed: true, assignee: 'James Mitchell' },
  { id: '3', title: 'Integration testing', completed: false, assignee: 'Sarah Chen' },
  { id: '4', title: 'Security audit', completed: false, assignee: 'TBD' },
  { id: '5', title: 'Performance optimization', completed: false, assignee: 'James Mitchell' }
];

const mockAttachments: Attachment[] = [
  { id: '1', name: 'technical_spec.pdf', size: '2.4 MB', uploadedBy: 'Sarah Chen', uploadedAt: '2 days ago' },
  { id: '2', name: 'migration_plan.xlsx', size: '1.1 MB', uploadedBy: 'Marcus Rodriguez', uploadedAt: '1 week ago' }
];

export function InitiativeDetailsDialog({ initiative, onClose }: InitiativeDetailsDialogProps) {
  const [newComment, setNewComment] = useState('');
  const completedSubtasks = mockSubtasks.filter(t => t.completed).length;
  const totalSubtasks = mockSubtasks.length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {initiative.isBigRock && (
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                )}
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {initiative.name}
                </DialogTitle>
              </div>
              <p className="text-sm text-gray-600">{initiative.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 p-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="comments">
                  Comments
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {mockComments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="subtasks">
                  Subtasks
                  <Badge variant="secondary" className="ml-2 h-5 rounded-full px-2 flex items-center justify-center text-xs">
                    {completedSubtasks}/{totalSubtasks}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="attachments">
                  Files
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {mockAttachments.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Progress</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall completion</span>
                      <span className="font-semibold text-gray-900">{initiative.progress}%</span>
                    </div>
                    <Progress value={initiative.progress} className="h-2" />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Start:</span>
                      <span className="text-gray-900">{initiative.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Due:</span>
                      <span className="text-gray-900">{initiative.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Questions & Blockers</h4>
                  {initiative.questions ? (
                    <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      {initiative.questions}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No questions or blockers reported</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {mockComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                          {comment.userInitials}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-gray-900">{comment.user}</span>
                              <span className="text-xs text-gray-500">{comment.timestamp}</span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Post Comment
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="subtasks" className="mt-4">
                <div className="space-y-2">
                  {mockSubtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        className="w-4 h-4 rounded border-gray-300"
                        readOnly
                      />
                      <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {subtask.title}
                      </span>
                      <span className="text-xs text-gray-500">{subtask.assignee}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Add Subtask
                </Button>
              </TabsContent>

              <TabsContent value="attachments" className="mt-4">
                <div className="space-y-2">
                  {mockAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-xs text-gray-500">
                          {attachment.size} • Uploaded by {attachment.uploadedBy} • {attachment.uploadedAt}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">Download</Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Status
              </label>
              <Badge className={`${initiative.status === 'On Track' ? 'bg-green-500' : initiative.status === 'At Risk' ? 'bg-yellow-500' : initiative.status === 'Blocked' ? 'bg-red-500' : initiative.status === 'Complete' ? 'bg-blue-500' : 'bg-gray-300'} text-white border-0 text-sm`}>
                {initiative.status}
              </Badge>
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Owner
              </label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                  {initiative.owner.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm text-gray-900">{initiative.owner}</span>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Priority
              </label>
              <Badge variant="outline" className={`${initiative.priority === 'P0' ? 'bg-red-100 text-red-700 border-red-200' : initiative.priority === 'P1' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'} text-sm`}>
                {initiative.priority}
              </Badge>
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Category
              </label>
              <Badge variant="outline" className={`${initiative.category === 'Engineering' ? 'bg-purple-50 text-purple-700 border-purple-200' : initiative.category === 'Design' ? 'bg-pink-50 text-pink-700 border-pink-200' : initiative.category === 'Sales' ? 'bg-green-50 text-green-700 border-green-200' : initiative.category === 'Product' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'} text-sm`}>
                {initiative.category}
              </Badge>
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Big Rock
              </label>
              <Badge className={`${initiative.isBigRock ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'} border-0 text-sm`}>
                {initiative.isBigRock ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
