import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, ListTodo } from 'lucide-react';
import TaskCard from './TaskCard';
import CreateTaskDialog from './CreateTaskDialog';

const STAGES = [
  { value: 'pre_qual', label: 'Pre-Qualification' },
  { value: 'showing', label: 'Showing' },
  { value: 'offer', label: 'Offer' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'closing', label: 'Closing' }
];

export default function TaskManager({ transaction, currentUser, userRole }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState(transaction.current_stage);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['transactionTasks', transaction.id],
    queryFn: () => base44.entities.TransactionTask.filter({ transaction_id: transaction.id }),
    refetchInterval: 5000
  });

  const currentStageTasks = tasks.filter(t => t.stage === selectedStage);
  const completedTasks = currentStageTasks.filter(t => t.status === 'completed').length;
  const progress = currentStageTasks.length > 0 
    ? (completedTasks / currentStageTasks.length) * 100 
    : 0;

  // Check if user can edit tasks
  const canEdit = userRole === 'agent' || userRole === 'admin' || userRole === 'builder';

  const tasksByStage = STAGES.map(stage => ({
    ...stage,
    tasks: tasks.filter(t => t.stage === stage.value),
    completed: tasks.filter(t => t.stage === stage.value && t.status === 'completed').length,
    total: tasks.filter(t => t.stage === stage.value).length
  }));

  const overallProgress = tasks.length > 0
    ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100
    : 0;

  if (isLoading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                Transaction Tasks
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {tasks.filter(t => t.status === 'completed').length} of {tasks.length} tasks completed
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Overall Progress</span>
              <span className="font-medium text-slate-900">{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedStage} onValueChange={setSelectedStage}>
        <TabsList className="w-full grid grid-cols-5">
          {STAGES.map(stage => (
            <TabsTrigger key={stage.value} value={stage.value} className="text-xs">
              {stage.label}
              {tasksByStage.find(s => s.value === stage.value)?.total > 0 && (
                <span className="ml-1 text-xs text-slate-500">
                  ({tasksByStage.find(s => s.value === stage.value)?.completed}/
                  {tasksByStage.find(s => s.value === stage.value)?.total})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {STAGES.map(stage => (
          <TabsContent key={stage.value} value={stage.value} className="space-y-3 mt-4">
            {currentStageTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-500">
                  No tasks for this stage yet
                </CardContent>
              </Card>
            ) : (
              currentStageTasks
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    canEdit={canEdit}
                  />
                ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {showCreateDialog && (
        <CreateTaskDialog
          transaction={transaction}
          currentStage={selectedStage}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}