import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, viewing_type, duration_seconds, liked, notes } = await req.json();

    // Create viewing history record
    const viewing = await base44.entities.ViewingHistory.create({
      buyer_email: user.email,
      property_id,
      viewed_date: new Date().toISOString(),
      viewing_type: viewing_type || 'listing_page',
      duration_seconds: duration_seconds || 0,
      liked: liked || false,
      notes: notes || '',
      engagement_score: calculateEngagementScore(duration_seconds, viewing_type, liked)
    });

    return Response.json({
      success: true,
      viewing_id: viewing.id,
      engagement_score: viewing.engagement_score
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateEngagementScore(durationSeconds, viewingType, liked) {
  let score = 0;

  // Base score for viewing type
  switch (viewingType) {
    case 'in_person':
      score = 80;
      break;
    case 'virtual_tour':
      score = 60;
      break;
    default:
      score = 30;
  }

  // Bonus for duration (more time = more interest)
  if (durationSeconds > 300) score += 20; // 5+ minutes
  else if (durationSeconds > 120) score += 10; // 2+ minutes

  // Bonus if liked
  if (liked) score += 15;

  return Math.min(score, 100);
}