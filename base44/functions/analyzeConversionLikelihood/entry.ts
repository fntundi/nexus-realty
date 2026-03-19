import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { model_id, lead_score, contact_data } = await req.json();

    // Get scoring model
    const model = await base44.entities.LeadScoringModel.get(model_id);
    if (!model) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    // Get all contacts to analyze conversion patterns
    const allContacts = await base44.entities.Contact.list();
    
    // Find contacts with transactions (conversions)
    const contactsWithTransactions = [];
    for (const contact of allContacts) {
      if (contact.related_transaction_ids && contact.related_transaction_ids.length > 0) {
        contactsWithTransactions.push(contact);
      }
    }

    // Calculate conversion stats by score range
    const scoreRanges = [
      { min: 0, max: 25, range: '0-25' },
      { min: 25, max: 50, range: '25-50' },
      { min: 50, max: 75, range: '50-75' },
      { min: 75, max: 100, range: '75-100' }
    ];

    const conversionStats = scoreRanges.map(range => {
      const contactsInRange = allContacts.filter(
        c => (c.lead_score || 0) >= range.min && (c.lead_score || 0) < range.max
      );
      const convertedInRange = contactsInRange.filter(
        c => c.related_transaction_ids && c.related_transaction_ids.length > 0
      );

      const conversionRate = contactsInRange.length > 0
        ? (convertedInRange.length / contactsInRange.length) * 100
        : 0;

      return {
        score_range: range.range,
        total_contacts: contactsInRange.length,
        converted: convertedInRange.length,
        conversion_rate: Math.round(conversionRate * 10) / 10
      };
    });

    // Analyze current lead's likelihood
    const currentLeadStats = {
      lead_score,
      similar_contacts_count: allContacts.filter(
        c => Math.abs((c.lead_score || 0) - lead_score) <= 10
      ).length
    };

    // Find the range for this lead
    const leadRangeStats = conversionStats.find(
      r => lead_score >= r.score_range.split('-')[0] && 
           lead_score < (parseInt(r.score_range.split('-')[1]) || 100)
    );

    // Calculate percentile
    const scoresAbove = allContacts.filter(c => (c.lead_score || 0) > lead_score).length;
    const percentile = Math.round(((allContacts.length - scoresAbove) / allContacts.length) * 100);

    return Response.json({
      success: true,
      lead_analysis: {
        score: lead_score,
        percentile,
        range_conversion_rate: leadRangeStats?.conversion_rate || 0,
        similar_leads: currentLeadStats.similar_contacts_count
      },
      conversion_by_score_range: conversionStats,
      model_effectiveness: {
        high_score_conversion: conversionStats.find(s => s.score_range === '75-100')?.conversion_rate || 0,
        low_score_conversion: conversionStats.find(s => s.score_range === '0-25')?.conversion_rate || 0,
        discrimination_index: calculateDiscrimination(conversionStats)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDiscrimination(stats) {
  const highScore = stats.find(s => s.score_range === '75-100')?.conversion_rate || 0;
  const lowScore = stats.find(s => s.score_range === '0-25')?.conversion_rate || 0;
  return Math.round((highScore - lowScore) * 10) / 10;
}