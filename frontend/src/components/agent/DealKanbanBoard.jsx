import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Loader2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';

const STAGES = [
  { id: 'pre_qual',       label: 'Pre-Qual',        color: 'bg-yellow-100 border-yellow-300',   badge: 'bg-yellow-100 text-yellow-800' },
  { id: 'showing',        label: 'Showing',          color: 'bg-blue-100 border-blue-300',        badge: 'bg-blue-100 text-blue-800' },
  { id: 'offer',          label: 'Offer',            color: 'bg-purple-100 border-purple-300',    badge: 'bg-purple-100 text-purple-800' },
  { id: 'under_contract', label: 'Under Contract',   color: 'bg-orange-100 border-orange-300',   badge: 'bg-orange-100 text-orange-800' },
  { id: 'closing',        label: 'Closing',          color: 'bg-green-100 border-green-300',      badge: 'bg-green-100 text-green-800' },
];

export default function DealKanbanBoard({ transactions, properties, onTransactionUpdate }) {
  const [movingId, setMovingId] = useState(null);

  const getProperty = (id) => properties.find(p => p.id === id);

  // Group transactions by stage
  const columns = STAGES.reduce((acc, stage) => {
    acc[stage.id] = transactions.filter(t => t.current_stage === stage.id);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const transaction = transactions.find(t => t.id === draggableId);
    if (!transaction) return;

    const fromStage = source.droppableId;
    const toStage = destination.droppableId;

    setMovingId(draggableId);
    try {
      // Update transaction stage in DB
      await base44.entities.Transaction.update(draggableId, {
        current_stage: toStage,
        stage_history: [
          ...(transaction.stage_history || []),
          { stage: toStage, entered_date: new Date().toISOString() }
        ]
      });

      // Trigger workflow
      await base44.functions.invoke('stageTransitionWorkflow', {
        transaction_id: draggableId,
        from_stage: fromStage,
        to_stage: toStage
      });

      onTransactionUpdate?.();
      toast.success(`Moved to ${STAGES.find(s => s.id === toStage)?.label}`);
    } catch (err) {
      console.error('Stage transition failed:', err);
      toast.error('Failed to update deal stage. Please try again.');
    } finally {
      setMovingId(null);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {STAGES.map(stage => {
          const cards = columns[stage.id] || [];
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-64 sm:w-72 flex flex-col"
            >
              {/* Column header */}
              <div className={`rounded-t-lg border-2 ${stage.color} px-3 py-2 flex items-center justify-between`}>
                <span className="font-semibold text-slate-800 text-sm">{stage.label}</span>
                <span className="text-xs bg-white/70 rounded-full px-2 py-0.5 font-medium text-slate-600">
                  {cards.length}
                </span>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-b-lg border-2 border-t-0 ${stage.color} p-2 space-y-2 min-h-32 transition-all ${
                      snapshot.isDraggingOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/50' : ''
                    }`}
                  >
                    {cards.map((txn, index) => (
                      <DealCard
                        key={txn.id}
                        transaction={txn}
                        property={getProperty(txn.property_id)}
                        index={index}
                        isMoving={movingId === txn.id}
                        badgeClass={stage.badge}
                      />
                    ))}
                    {provided.placeholder}
                    {cards.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-xs text-slate-400 text-center pt-4 italic">Drop deals here</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function DealCard({ transaction, property, index, isMoving, badgeClass }) {
  return (
    <Draggable draggableId={transaction.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-shadow ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400 rotate-1' : 'hover:shadow-md'
          } ${isMoving ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <div className="flex items-center gap-1 px-2 pt-2">
            <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <p className="font-semibold text-slate-900 text-xs truncate flex-1">
              {property?.address || 'Property TBD'}
            </p>
            {isMoving && <Loader2 className="w-3 h-3 animate-spin text-blue-500 flex-shrink-0" />}
          </div>

          <div className="px-3 pb-2 pt-1 space-y-1">
            {property?.price && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <DollarSign className="w-3 h-3 flex-shrink-0" />
                <span>${property.price.toLocaleString()}</span>
              </div>
            )}
            {transaction.closing_date && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{format(new Date(transaction.closing_date), 'MMM d')}</span>
              </div>
            )}
            <Link to={createPageUrl(`AgentTransactions?id=${transaction.id}`)}>
              <Button size="sm" variant="outline" className="w-full h-6 text-xs mt-1">
                Details
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Draggable>
  );
}