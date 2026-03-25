import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const TAG = '__test__';

// ─── SEED DATA DEFINITIONS ───────────────────────────────────────────────────

async function seedAll(user, setLog) {
  const log = (msg) => setLog(prev => [...prev, msg]);

  // 1. Market
  log('Creating market...');
  const market = await base44.entities.Market.create({
    name: 'Austin Metro', state: 'TX', country: 'USA',
    status: 'active',
    assignment_rules: { territory_weight: 0.25, workload_weight: 0.2, rotation_weight: 0.15, success_rate_weight: 0.2, property_performance_weight: 0.1, lead_source_weight: 0.1 }
  });

  // 2. Properties
  log('Creating properties...');
  const props = await base44.entities.Property.bulkCreate([
    { market_id: market.id, address: '1234 Sunset Blvd', city: 'Austin', state: 'TX', zip_code: '78701', price: 485000, bedrooms: 3, bathrooms: 2, square_feet: 1950, property_type: 'single_family', status: 'active', description: 'Charming craftsman near downtown with updated kitchen.', photos: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600'] },
    { market_id: market.id, address: '567 Oak Creek Dr', city: 'Austin', state: 'TX', zip_code: '78704', price: 720000, bedrooms: 4, bathrooms: 3, square_feet: 2800, property_type: 'single_family', status: 'active', description: 'Spacious family home in Zilker area with pool.', photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600'] },
    { market_id: market.id, address: '88 Rainey St #405', city: 'Austin', state: 'TX', zip_code: '78701', price: 310000, bedrooms: 1, bathrooms: 1, square_feet: 750, property_type: 'condo', status: 'pending', description: 'Modern condo in the heart of Rainey Street.', photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'] },
    { market_id: market.id, address: '200 Barton Springs Rd', city: 'Austin', state: 'TX', zip_code: '78704', price: 650000, bedrooms: 3, bathrooms: 2.5, square_feet: 2200, property_type: 'townhouse', status: 'active', description: 'Stunning townhouse with rooftop deck and city views.', photos: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600'] },
  ]);

  // 3. Agents
  log('Creating agents...');
  const agentEmail1 = user.email; // use current user as main agent
  const agents = await base44.entities.Agent.bulkCreate([
    { user_email: agentEmail1, market_id: market.id, phone: '(512) 555-0101', status: 'active', license_number: 'TX-12345', current_workload: 3, max_workload: 10, closed_deals: 14, success_rate: 68, territories: ['78701', '78704'] },
  ]);

  // 4. Contacts (buyers)
  log('Creating contacts...');
  const contacts = await base44.entities.Contact.bulkCreate([
    { first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah.mitchell@testbuyer.com', phone: '(512) 555-1001', contact_type: 'buyer', status: 'active', market_id: market.id, assigned_agent_email: agentEmail1, lead_score: 88, notes: 'Pre-approved for $550k. Wants 3bed near good schools. Very motivated.', tags: [TAG], city: 'Austin', state: 'TX' },
    { first_name: 'James', last_name: 'Torres', email: 'james.torres@testbuyer.com', phone: '(512) 555-1002', contact_type: 'buyer', status: 'active', market_id: market.id, assigned_agent_email: agentEmail1, lead_score: 72, notes: 'First-time buyer. Budget $350-420k. Interested in condos and townhouses.', tags: [TAG], city: 'Austin', state: 'TX' },
    { first_name: 'Linda', last_name: 'Chen', email: 'linda.chen@testbuyer.com', phone: '(512) 555-1003', contact_type: 'buyer', status: 'prospect', market_id: market.id, assigned_agent_email: agentEmail1, lead_score: 55, notes: 'Relocating from San Francisco. Remote worker, flexible on location.', tags: [TAG], city: 'Austin', state: 'TX' },
    { first_name: 'Marcus', last_name: 'Johnson', email: 'marcus.johnson@testbuyer.com', phone: '(512) 555-1004', contact_type: 'buyer', status: 'active', market_id: market.id, assigned_agent_email: agentEmail1, lead_score: 91, notes: 'Cash buyer. Looking for investment property. Very serious.', tags: [TAG], city: 'Austin', state: 'TX' },
    { first_name: 'Emily', last_name: 'Nakamura', email: 'emily.nakamura@testlender.com', phone: '(512) 555-2001', contact_type: 'lender', status: 'active', market_id: market.id, notes: 'Primary lender contact at Austin First Bank. Great rates.', tags: [TAG], company: 'Austin First Bank', city: 'Austin', state: 'TX' },
  ]);

  // 5. Leads
  log('Creating leads...');
  const leads = await base44.entities.Lead.bulkCreate([
    { market_id: market.id, buyer_email: 'sarah.mitchell@testbuyer.com', buyer_name: 'Sarah Mitchell', buyer_phone: '(512) 555-1001', source: 'property_inquiry', property_id: props[0].id, status: 'active', assigned_agent_id: agents[0].id, budget_min: 450000, budget_max: 550000, preferred_areas: ['78701', '78704'], notes: 'Inquired about 1234 Sunset Blvd listing.' },
    { market_id: market.id, buyer_email: 'james.torres@testbuyer.com', buyer_name: 'James Torres', buyer_phone: '(512) 555-1002', source: 'registration', status: 'qualified', assigned_agent_id: agents[0].id, budget_min: 300000, budget_max: 420000, notes: 'Signed up via website. Looking for condo or townhouse.' },
    { market_id: market.id, buyer_email: 'marcus.johnson@testbuyer.com', buyer_name: 'Marcus Johnson', buyer_phone: '(512) 555-1004', source: 'showing_request', property_id: props[1].id, status: 'active', assigned_agent_id: agents[0].id, budget_min: 600000, budget_max: 800000, notes: 'Cash buyer. Requested showing for 567 Oak Creek.' },
    { market_id: market.id, buyer_email: 'linda.chen@testbuyer.com', buyer_name: 'Linda Chen', buyer_phone: '(512) 555-1003', source: 'external_import', status: 'assigned', assigned_agent_id: agents[0].id, budget_min: 400000, budget_max: 600000, notes: 'Imported from Follow Up Boss.' },
  ]);

  // 6. Transactions (one per major stage)
  log('Creating transactions...');
  const txns = await base44.entities.Transaction.bulkCreate([
    { lead_id: leads[0].id, market_id: market.id, agent_id: agents[0].id, property_id: props[0].id, buyer_email: 'sarah.mitchell@testbuyer.com', current_stage: 'showing', status: 'active', offer_amount: null, commission_percentage: 3, commission_status: 'pending', stage_history: [{ stage: 'pre_qual', entered_date: new Date(Date.now() - 15 * 86400000).toISOString() }, { stage: 'showing', entered_date: new Date(Date.now() - 5 * 86400000).toISOString() }] },
    { lead_id: leads[2].id, market_id: market.id, agent_id: agents[0].id, property_id: props[1].id, buyer_email: 'marcus.johnson@testbuyer.com', current_stage: 'offer', status: 'active', offer_amount: 710000, commission_percentage: 3, commission_status: 'pending', stage_history: [{ stage: 'pre_qual', entered_date: new Date(Date.now() - 30 * 86400000).toISOString() }, { stage: 'showing', entered_date: new Date(Date.now() - 20 * 86400000).toISOString() }, { stage: 'offer', entered_date: new Date(Date.now() - 3 * 86400000).toISOString() }] },
    { lead_id: leads[1].id, market_id: market.id, agent_id: agents[0].id, property_id: props[2].id, buyer_email: 'james.torres@testbuyer.com', current_stage: 'under_contract', status: 'active', offer_amount: 305000, contract_price: 308000, closing_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], commission_percentage: 3, commission_status: 'earned', stage_history: [{ stage: 'pre_qual', entered_date: new Date(Date.now() - 45 * 86400000).toISOString() }, { stage: 'under_contract', entered_date: new Date(Date.now() - 7 * 86400000).toISOString() }] },
    { lead_id: leads[3].id, market_id: market.id, agent_id: agents[0].id, property_id: props[3].id, buyer_email: 'linda.chen@testbuyer.com', current_stage: 'closing', status: 'active', offer_amount: 640000, contract_price: 645000, closing_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], commission_percentage: 3, commission_status: 'earned', stage_history: [{ stage: 'closing', entered_date: new Date(Date.now() - 2 * 86400000).toISOString() }] },
  ]);

  // 7. Tasks
  log('Creating tasks...');
  await base44.entities.Task.bulkCreate([
    { title: 'Follow up with Sarah after showing', task_type: 'follow_up', status: 'pending', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString(), assigned_to_email: agentEmail1, contact_email: 'sarah.mitchell@testbuyer.com', transaction_id: txns[0].id, tags: [TAG] },
    { title: 'Submit offer paperwork for Marcus', task_type: 'document', status: 'pending', priority: 'critical', due_date: new Date(Date.now() + 2 * 86400000).toISOString(), assigned_to_email: agentEmail1, contact_email: 'marcus.johnson@testbuyer.com', transaction_id: txns[1].id, tags: [TAG] },
    { title: 'Schedule final walkthrough - Rainey St', task_type: 'meeting', status: 'pending', priority: 'high', due_date: new Date(Date.now() + 3 * 86400000).toISOString(), assigned_to_email: agentEmail1, contact_email: 'james.torres@testbuyer.com', transaction_id: txns[2].id, tags: [TAG] },
    { title: 'Confirm closing docs with title company', task_type: 'call', status: 'in_progress', priority: 'critical', due_date: new Date(Date.now() + 86400000).toISOString(), assigned_to_email: agentEmail1, contact_email: 'linda.chen@testbuyer.com', transaction_id: txns[3].id, tags: [TAG] },
    { title: 'Call James to discuss loan pre-approval', task_type: 'call', status: 'pending', priority: 'medium', due_date: new Date(Date.now() - 86400000).toISOString(), assigned_to_email: agentEmail1, contact_email: 'james.torres@testbuyer.com', tags: [TAG] },
  ]);

  // 8. Interactions
  log('Creating interactions...');
  await base44.entities.Interaction.bulkCreate([
    { contact_id: contacts[0].id, interaction_type: 'call', subject: 'Initial consultation call', description: 'Discussed budget, preferred neighborhoods, and timeline. Sarah is ready to move within 90 days.', conducted_by: agentEmail1, interaction_date: new Date(Date.now() - 10 * 86400000).toISOString(), duration_minutes: 25, outcome: 'follow_up_needed', next_step: 'Schedule showings for Sunset Blvd and a few comparable homes', priority: 'high' },
    { contact_id: contacts[0].id, interaction_type: 'meeting', subject: 'Property showing - 1234 Sunset Blvd', description: 'Sarah loved the kitchen and backyard. Some concerns about the master bedroom size.', conducted_by: agentEmail1, interaction_date: new Date(Date.now() - 5 * 86400000).toISOString(), duration_minutes: 60, outcome: 'follow_up_needed', next_step: 'Follow up to gauge interest and schedule a second showing', priority: 'high' },
    { contact_id: contacts[3].id, interaction_type: 'call', subject: 'Offer strategy discussion', description: 'Marcus wants to come in strong at $710k with quick close. Reviewed comps together.', conducted_by: agentEmail1, interaction_date: new Date(Date.now() - 3 * 86400000).toISOString(), duration_minutes: 30, outcome: 'action_taken', next_step: 'Draft offer letter', priority: 'high' },
    { contact_id: contacts[1].id, interaction_type: 'email', subject: 'Sent contract documents', description: 'Emailed purchase agreement and disclosures to James for review with his attorney.', conducted_by: agentEmail1, interaction_date: new Date(Date.now() - 8 * 86400000).toISOString(), outcome: 'scheduled', priority: 'medium' },
  ]);

  // 9. Messages
  log('Creating messages...');
  await base44.entities.Message.bulkCreate([
    { transaction_id: txns[0].id, sender_email: agentEmail1, recipient_emails: ['sarah.mitchell@testbuyer.com'], content: 'Hi Sarah! Great seeing the property today. What did you think overall? Ready to discuss next steps.', message_type: 'message' },
    { transaction_id: txns[0].id, sender_email: 'sarah.mitchell@testbuyer.com', recipient_emails: [agentEmail1], content: 'I really liked it! The kitchen is beautiful. I want to see one or two more before deciding. Can we schedule for this weekend?', message_type: 'message' },
    { transaction_id: txns[1].id, sender_email: agentEmail1, recipient_emails: ['marcus.johnson@testbuyer.com'], content: 'Marcus, I\'ve drafted the offer at $710,000 cash with a 21-day close. Please review and sign when ready.', message_type: 'document_request' },
    { transaction_id: txns[3].id, sender_email: agentEmail1, recipient_emails: ['linda.chen@testbuyer.com', 'emily.nakamura@testlender.com'], content: 'Closing is confirmed for next Friday at 2pm. Please bring your government ID and certified funds.', message_type: 'message' },
  ]);

  // 10. Notifications
  log('Creating notifications...');
  await base44.entities.Notification.bulkCreate([
    { recipient_email: agentEmail1, notification_type: 'new_offer', title: 'Offer submitted on 567 Oak Creek Dr', message: 'Marcus Johnson submitted an offer of $710,000. Review and prepare counter-offer strategy.', related_entity_type: 'transaction', related_entity_id: txns[1].id, is_read: false, priority: 'high' },
    { recipient_email: agentEmail1, notification_type: 'closing_reminder', title: 'Closing in 10 days - 200 Barton Springs', message: 'Linda Chen\'s closing is scheduled for next week. Ensure all documents are in order.', related_entity_type: 'transaction', related_entity_id: txns[3].id, is_read: false, priority: 'high' },
    { recipient_email: agentEmail1, notification_type: 'lead_assigned', title: 'New lead assigned: Linda Chen', message: 'Linda Chen was automatically assigned to you based on territory matching.', related_entity_type: 'lead', related_entity_id: leads[3].id, is_read: true, priority: 'medium' },
    { recipient_email: agentEmail1, notification_type: 'deal_update', title: 'James Torres moved to Under Contract', message: 'James Torres transaction on 88 Rainey St has been moved to Under Contract stage.', related_entity_type: 'transaction', related_entity_id: txns[2].id, is_read: false, priority: 'medium' },
  ]);

  // 11. Stage Workflow Rules
  log('Creating workflow rules...');
  await base44.entities.StageWorkflowRule.bulkCreate([
    { name: 'Pre-Qual → Showing: Schedule Showing Task', from_stage: 'pre_qual', to_stage: 'showing', is_active: true, actions: [{ action_type: 'create_task', title: 'Schedule property showing for {{buyer_email}}', description: 'Set up initial showing at {{property_address}}', assign_to_role: 'agent', priority: 'high', due_days_offset: 2 }] },
    { name: 'Offer → Under Contract: Create Contract Checklist', from_stage: 'offer', to_stage: 'under_contract', is_active: true, actions: [{ action_type: 'generate_checklist', title: 'Complete under-contract checklist for {{property_address}}', description: 'Order inspection, appraisal, and review HOA docs. Closing date: {{closing_date}}', assign_to_role: 'agent', priority: 'critical', due_days_offset: 5 }, { action_type: 'send_notification', title: 'Under Contract!', description: '{{property_address}} is now under contract at {{contract_price}}', notify_roles: ['agent', 'buyer'] }] },
    { name: 'Any → Closing: Final Closing Checklist', from_stage: 'any', to_stage: 'closing', is_active: true, actions: [{ action_type: 'create_task', title: 'Confirm closing docs for {{property_address}}', description: 'Review closing disclosure, wire instructions, and final walkthrough.', assign_to_role: 'agent', priority: 'critical', due_days_offset: 1 }] },
  ]);

  // 12. Email Templates
  log('Creating email templates...');
  await base44.entities.EmailTemplate.bulkCreate([
    { name: 'Welcome New Lead', subject: 'Welcome {{first_name}} — Let\'s Find Your Dream Home!', body: '<p>Hi {{first_name}},</p><p>Thanks for reaching out! I\'m excited to help you find the perfect home in Austin. Based on your preferences, I\'ll be sending you curated listings that match your criteria.</p><p>Feel free to reply with any questions!</p><p>Best,<br/>Your Agent</p>', variables: ['first_name'], is_active: true },
    { name: 'Showing Follow-Up', subject: 'How did you like {{property_address}}?', body: '<p>Hi {{first_name}},</p><p>It was great showing you {{property_address}} today! I\'d love to hear your thoughts.</p><p>If you\'re interested, we can move quickly — this property has had strong interest.</p><p>Ready to take the next step?</p>', variables: ['first_name', 'property_address'], is_active: true },
    { name: 'Offer Submitted Confirmation', subject: 'Your Offer Has Been Submitted — {{property_address}}', body: '<p>Great news {{first_name}}! Your offer of {{offer_amount}} has been submitted for {{property_address}}.</p><p>We typically hear back within 24–48 hours. I\'ll keep you posted!</p>', variables: ['first_name', 'property_address', 'offer_amount'], is_active: true },
  ]);

  // 13. Development Project
  log('Creating development project...');
  const devProject = await base44.entities.DevelopmentProject.create({
    name: 'Barton Hills Residences', type: 'new_construction', developer_email: agentEmail1, market_id: market.id,
    description: 'A boutique community of 24 modern homes in the heart of Barton Hills. Energy-efficient construction with premium finishes.',
    location: '450 Barton Hills Dr, Austin, TX 78704', total_units: 24, estimated_value: 18500000,
    start_date: '2025-06-01', estimated_completion: '2026-12-01', status: 'construction',
    amenities: ['Community Pool', 'Dog Park', 'EV Charging', 'Smart Home Package'],
    hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    summary_stats: { min_price: 620000, max_price: 890000, avg_size_sqft: 2400, green_space_acres: 1.2 }
  });

  await base44.entities.ProjectMilestone.bulkCreate([
    { project_id: devProject.id, title: 'Building Permits Approved', category: 'permitting', scheduled_date: '2025-05-15', actual_date: '2025-05-20', status: 'completed', order: 1 },
    { project_id: devProject.id, title: 'Foundation Complete', category: 'construction_phase', scheduled_date: '2025-09-01', actual_date: '2025-09-10', status: 'completed', order: 2 },
    { project_id: devProject.id, title: 'Framing & Roofing', category: 'construction_phase', scheduled_date: '2026-01-15', status: 'in_progress', order: 3 },
    { project_id: devProject.id, title: 'Pre-Sale Event', category: 'sales_event', scheduled_date: '2026-07-01', status: 'pending', order: 4 },
    { project_id: devProject.id, title: 'Certificate of Occupancy', category: 'completion', scheduled_date: '2026-11-15', status: 'pending', order: 5 },
  ]);

  // 14. Lead Scoring Rules
  log('Creating lead scoring rules...');
  await base44.entities.LeadScoringRule.bulkCreate([
    { name: 'High Score Alert', description: 'Notify agent when lead reaches 80+ score', score_threshold: 80, is_active: true, action_type: 'send_notification', notify_agent_email: agentEmail1, notification_message: 'Lead {{contact_name}} has reached a score of {{lead_score}}. Time to reach out!' },
    { name: 'Hot Lead Auto-Task', description: 'Create urgent call task when lead hits 90+', score_threshold: 90, is_active: true, action_type: 'create_task', task_title: 'URGENT: Call {{contact_name}} — score {{lead_score}}', task_description: 'This lead is very hot. Reach out within the hour.', task_priority: 'critical' },
  ]);

  log('✅ All test data created successfully!');
  return { market, agents, contacts, props, leads, txns };
}

// ─── CLEAR TEST DATA ──────────────────────────────────────────────────────────

async function clearAll(setLog) {
  const log = (msg) => setLog(prev => [...prev, msg]);
  log('Clearing test data...');

  const entities = [
    'LeadScoringRule', 'StageWorkflowRule', 'EmailTemplate',
    'Notification', 'Message', 'Interaction', 'Task',
    'Transaction', 'Lead', 'Showing', 'Document',
    'ProjectMilestone', 'DevelopmentProject',
    'Contact', 'Agent', 'Property', 'Market',
  ];

  for (const name of entities) {
    try {
      const records = await base44.entities[name].list('-created_date', 200);
      const testRecords = records.filter(r =>
        r.tags?.includes(TAG) ||
        r.name === 'Austin Metro' ||
        r.address?.includes('Sunset Blvd') || r.address?.includes('Oak Creek') ||
        r.address?.includes('Rainey St') || r.address?.includes('Barton Springs') ||
        r.email?.endsWith('@testbuyer.com') || r.email?.endsWith('@testlender.com') ||
        r.user_email?.endsWith('@testbuyer.com') ||
        r.name === 'Barton Hills Residences' ||
        r.project_id != null || // milestones
        r.buyer_email?.endsWith('@testbuyer.com') ||
        r.sender_email?.endsWith('@testbuyer.com') ||
        r.recipient_email === 'emily.nakamura@testlender.com'
      );
      for (const r of testRecords) {
        await base44.entities[name].delete(r.id);
      }
      if (testRecords.length > 0) log(`Deleted ${testRecords.length} ${name} record(s)`);
    } catch (e) {
      log(`⚠️ Could not clear ${name}: ${e.message}`);
    }
  }
  log('✅ Test data cleared!');
}

// ─── PAGE COMPONENT ───────────────────────────────────────────────────────────

export default function SeedTestData() {
  const [loading, setLoading]     = useState(false);
  const [clearing, setClearing]   = useState(false);
  const [log, setLog]             = useState([]);
  const [done, setDone]           = useState(false);
  const [cleared, setCleared]     = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    setLog([]);
    setDone(false);
    try {
      const { data: user } = await base44.auth.me().then(u => ({ data: u }));
      await seedAll(user, setLog);
      setDone(true);
      toast.success('Test data seeded successfully!');
    } catch (err) {
      setLog(prev => [...prev, `❌ Error: ${err.message}`]);
      toast.error('Seeding failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Remove all test data? This cannot be undone.')) return;
    setClearing(true);
    setLog([]);
    setCleared(false);
    try {
      await clearAll(setLog);
      setCleared(true);
      toast.success('Test data cleared!');
    } catch (err) {
      setLog(prev => [...prev, `❌ Error: ${err.message}`]);
      toast.error('Clear failed: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  const WHAT_GETS_CREATED = [
    { label: 'Market', desc: 'Austin Metro — TX' },
    { label: '4 Properties', desc: 'Varied types, stages & prices' },
    { label: '1 Agent Profile', desc: 'Linked to your logged-in account' },
    { label: '5 Contacts', desc: '4 buyers + 1 lender' },
    { label: '4 Leads', desc: 'All stages & sources' },
    { label: '4 Transactions', desc: 'Showing → Closing stages' },
    { label: '5 Tasks', desc: 'Mix of priorities & overdue' },
    { label: 'Interactions', desc: 'Call, meeting, email logs' },
    { label: 'Messages', desc: 'Per-transaction chat threads' },
    { label: 'Notifications', desc: 'Unread + read' },
    { label: 'Workflow Rules', desc: 'Stage transition automations' },
    { label: 'Email Templates', desc: 'Welcome, follow-up, offer' },
    { label: 'Dev Project', desc: 'Barton Hills with milestones' },
    { label: 'Scoring Rules', desc: 'Alert at 80 & 90 score' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" /> Seed Test Data
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Populate every feature of the app with realistic demo data — then remove it all with one click.
          </p>
        </div>

        {/* What gets created */}
        <Card>
          <CardHeader><CardTitle className="text-base">What gets created</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WHAT_GETS_CREATED.map(item => (
                <div key={item.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>{item.label}</strong> — {item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSeed} disabled={loading || clearing} className="flex-1 sm:flex-none h-11">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            {loading ? 'Seeding…' : 'Seed Test Data'}
          </Button>
          <Button variant="destructive" onClick={handleClear} disabled={loading || clearing} className="flex-1 sm:flex-none h-11">
            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {clearing ? 'Clearing…' : 'Clear All Test Data'}
          </Button>
        </div>

        {/* Log */}
        {log.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {(done || cleared) ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                Progress Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
                {log.map((line, i) => (
                  <div key={i} className={line.startsWith('✅') ? 'text-green-400' : line.startsWith('❌') ? 'text-red-400' : line.startsWith('⚠️') ? 'text-yellow-400' : 'text-slate-300'}>
                    {line}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {done && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Test data is ready!</p>
                <p className="text-sm text-green-700 mt-1">Navigate to <strong>Agent Dashboard</strong>, <strong>Contacts</strong>, <strong>Transactions</strong>, <strong>Project Showcase</strong>, and other pages to see live data.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {cleared && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">All test data has been removed from the database.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}