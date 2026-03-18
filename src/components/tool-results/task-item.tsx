import { format } from 'date-fns';
import { Calendar, CheckCircle } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/utils/cn';

import { registerToolRenderer, type ToolResultProps } from './registry';
import type { GoogleTask } from './task-list';

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

export function TaskItem({ result }: ToolResultProps) {
  const task = result as GoogleTask | undefined;
  if (!task?.title) return null;

  const isCompleted = task.status === 'completed';

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <h3 className="font-medium text-sm text-card-foreground">Task Created</h3>
      </div>

      <div className="flex items-start gap-3 py-2">
        <Checkbox checked={isCompleted} disabled className="mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate',
                isCompleted && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </span>

            {task.due && (
              <span className="inline-flex items-center gap-1 shrink-0 text-xs text-muted-foreground bg-secondary rounded-md px-2 py-0.5">
                <Calendar className="w-3 h-3" />
                {formatDate(task.due)}
              </span>
            )}
          </div>

          {task.notes && (
            <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

registerToolRenderer('createTasksTool', TaskItem);
