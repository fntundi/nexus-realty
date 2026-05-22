import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();

    if (!agent_id) {
      return Response.json({ error: 'Missing agent_id' }, { status: 400 });
    }

    // Fetch agent's transactions
    const transactions = await base44.entities.Transaction.filter({ agent_id }, '-created_date');
    
    // Fetch all tasks for these transactions
    const transactionIds = transactions.map(t => t.id);
    const allTasks = await base44.entities.TransactionTask.list();
    const tasks = allTasks.filter(task => transactionIds.includes(task.transaction_id));

    // Calculate metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeTransactions = transactions.filter(t => t.status === 'active');
    const recentTransactions = transactions.filter(t => new Date(t.created_date) > thirtyDaysAgo);
    
    // Deal velocity (avg days from created to closed)
    const closedDeals = transactions.filter(t => t.status === 'closed_won' && t.closing_date);
    let avgDaysToClose = 0;
    if (closedDeals.length > 0) {
      const totalDays = closedDeals.reduce((sum, deal) => {
        const days = Math.floor((new Date(deal.closing_date) - new Date(deal.created_date)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgDaysToClose = Math.round(totalDays / closedDeals.length);
    }

    // Task completion rate
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Find stalled transactions (no activity in 7+ days)
    const stalledTransactions = activeTransactions.filter(t => {
      const lastUpdate = new Date(t.updated_date);
      const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
      return daysSinceUpdate >= 7;
    });

    // Find overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      return new Date(t.due_date) < now;
    });

    // Find upcoming deadlines (next 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    });

    // Use AI to generate insights
    const prompt = `Analyze this real estate agent's performance data and provide 3-4 actionable insights:

Metrics:
- Active Transactions: ${activeTransactions.length}
- Transactions (Last 30 Days): ${recentTransactions.length}
- Average Days to Close: ${avgDaysToClose}
- Task Completion Rate: ${taskCompletionRate}%
- Stalled Transactions: ${stalledTransactions.length}
- Overdue Tasks: ${overdueTasks.length}
- Upcoming Deadlines: ${upcomingTasks.length}

Provide insights as a JSON array of objects with "type" (success/warning/info) and "message" (short, actionable insight).`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                message: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      metrics: {
        activeTransactions: activeTransactions.length,
        recentTransactions: recentTransactions.length,
        avgDaysToClose,
        taskCompletionRate,
        stalledCount: stalledTransactions.length,
        overdueTasksCount: overdueTasks.length,
        upcomingDeadlinesCount: upcomingTasks.length
      },
      alerts: {
        stalled: stalledTransactions.map(t => ({
          transaction_id: t.id,
          property_id: t.property_id,
          buyer_email: t.buyer_email,
          days_since_update: Math.floor((now - new Date(t.updated_date)) / (1000 * 60 * 60 * 24))
        })),
        overdue: overdueTasks.map(t => ({
          task_id: t.id,
          transaction_id: t.transaction_id,
          title: t.title,
          due_date: t.due_date,
          days_overdue: Math.floor((now - new Date(t.due_date)) / (1000 * 60 * 60 * 24))
        })),
        upcoming: upcomingTasks.map(t => ({
          task_id: t.id,
          transaction_id: t.transaction_id,
          title: t.title,
          due_date: t.due_date,
          days_until: Math.floor((new Date(t.due_date) - now) / (1000 * 60 * 60 * 24))
        }))
      },
      insights: aiResponse.insights || []
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});