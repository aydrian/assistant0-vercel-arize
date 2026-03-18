import { format } from 'date-fns';
import { Calendar, ExternalLink, ListTodo } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/utils/cn';

import { registerToolRenderer, type ToolResultProps } from './registry';

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: string;
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  position: string;
  links?: Array<{ type?: string; description?: string; link?: string }>;
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

function TaskRow({ task }: { task: GoogleTask }) {
  const isCompleted = task.status === 'completed';

  return (
    <div className="flex items-start gap-3 py-3">
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

          {task.due && !isCompleted && (
            <span className="inline-flex items-center gap-1 shrink-0 text-xs text-muted-foreground bg-secondary rounded-md px-2 py-0.5">
              <Calendar className="w-3 h-3" />
              {formatDate(task.due)}
            </span>
          )}

          {isCompleted && task.completed && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Completed {formatDate(task.completed)}
            </span>
          )}
        </div>

        {task.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.notes}</p>
        )}

        {task.links && task.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {task.links.map((link, i) => (
              link.link && (
                <a
                  key={i}
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-secondary rounded-full px-2 py-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  {link.description || 'Link'}
                </a>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskList({ result }: ToolResultProps) {
  const tasks: GoogleTask[] = Array.isArray(result?.tasks) ? result.tasks : [];
  const count = result?.tasksCount ?? tasks.length;

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <ListTodo className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium text-sm text-card-foreground">Tasks ({count})</h3>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No tasks found</p>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <TaskRow key={task.id ?? task.position} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

registerToolRenderer('getTasksTool', TaskList);
