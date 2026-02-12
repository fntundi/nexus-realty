import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ScheduleTaskDialog from '../components/tasks/ScheduleTaskDialog';
import TaskCard from '../components/tasks/TaskCard';
import { Calendar } from '@/components/ui/calendar';

const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-due_date', 200)
  });

  const upcomingTasks = tasks
    .filter(task => task.status !== 'completed' && new Date(task.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 10);

  const overdueTasks = tasks
    .filter(task => task.status !== 'completed' && new Date(task.due_date) < new Date())
    .sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

  const completedTasks = tasks
    .filter(task => task.status === 'completed')
    .slice(0, 5);

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString() && task.status !== 'completed';
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Calendar & Tasks</h1>
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Task</DialogTitle>
              </DialogHeader>
              <ScheduleTaskDialog onSuccess={() => setShowTaskDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handlePrevMonth}>←</Button>
                  <Button size="sm" variant="outline" onClick={handleNextMonth}>→</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center font-semibold text-xs text-slate-600 h-8 flex items-center justify-center">
                      {day}
                    </div>
                  ))}
                  {days.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => day && setSelectedDate(day)}
                      className={`h-10 rounded text-sm font-medium transition-colors ${
                        day
                          ? `${day.toDateString() === selectedDate?.toDateString()
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                          } relative`
                          : ''
                      }`}
                    >
                      {day?.getDate()}
                      {day && getTasksForDate(day).length > 0 && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>

                {selectedDate && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      {selectedDate.toLocaleDateString()}
                    </p>
                    {getTasksForDate(selectedDate).length > 0 ? (
                      <div className="space-y-2">
                        {getTasksForDate(selectedDate).map(task => (
                          <div key={task.id} className="p-2 bg-slate-50 rounded text-xs border-l-2 border-blue-600">
                            <p className="font-semibold text-slate-900">{task.title}</p>
                            <p className="text-slate-600">{new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">No tasks scheduled</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Summary */}
          <div className="lg:col-span-2 space-y-6">
            {overdueTasks.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <CardTitle className="text-red-900">{overdueTasks.length} Overdue Tasks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overdueTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-center py-8">No upcoming tasks</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Tasks Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            {tasks.filter(t => t.status !== 'completed').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.filter(t => t.status !== 'completed').map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  No active tasks
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4">
            {completedTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  No completed tasks
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}