import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { buyer_email } = await req.json();

    // Get buyer's viewing history
    const viewingHistory = await base44.entities.ViewingHistory.filter(
      { buyer_email },
      '-viewed_date'
    );

    // Get buyer's saved searches
    const savedSearches = await base44.entities.SavedSearch.filter({
      user_email: buyer_email
    });

    // Get all properties
    const allProperties = await base44.entities.Property.list();

    // Get buyer's preferences from profile
    const userMeta = await base44.auth.me();
    const priceMin = userMeta?.price_min || 0;
    const priceMax = userMeta?.price_max || Infinity;
    const preferredLocations = userMeta?.preferred_locations || [];

    // Get existing recommendations to avoid duplicates
    const existingRecs = await base44.entities.PropertyRecommendation.filter({
      buyer_email
    });
    const recommendedPropertyIds = new Set(existingRecs.map(r => r.property_id));

    const recommendations = [];

    for (const property of allProperties) {
      if (recommendedPropertyIds.has(property.id)) continue;
      if (!property.price || property.status !== 'active') continue;

      const scores = {
        price_match: calculatePriceMatch(property.price, priceMin, priceMax),
        location_match: calculateLocationMatch(property, preferredLocations, savedSearches),
        features_match: calculateFeaturesMatch(property, savedSearches),
        recent_viewing_bonus: hasRecentViewing(property.id, viewingHistory) ? 15 : 0,
        saved_search_match: matchesSavedSearch(property, savedSearches)
      };

      const totalScore = Math.round(
        (scores.price_match * 0.25) +
        (scores.location_match * 0.25) +
        (scores.features_match * 0.25) +
        (scores.recent_viewing_bonus * 0.1) +
        (scores.saved_search_match * 0.15)
      );

      if (totalScore >= 50) {
        recommendations.push({
          buyer_email,
          property_id: property.id,
          recommendation_score: totalScore,
          score_breakdown: scores,
          reason: generateReason(scores, property),
          generated_date: new Date().toISOString(),
          is_new_listing: isNewListing(property)
        });
      }
    }

    // Sort by score and limit to 20 recommendations
    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);
    const topRecommendations = recommendations.slice(0, 20);

    // Save recommendations
    if (topRecommendations.length > 0) {
      await base44.entities.PropertyRecommendation.bulkCreate(topRecommendations);
    }

    return Response.json({
      success: true,
      generated_count: topRecommendations.length,
      recommendations: topRecommendations
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculatePriceMatch(propertyPrice, priceMin, priceMax) {
  if (propertyPrice < priceMin || propertyPrice > priceMax) {
    const distance = propertyPrice < priceMin
      ? priceMin - propertyPrice
      : propertyPrice - priceMax;
    const tolerance = (priceMax - priceMin) * 0.15;
    if (distance > tolerance) return 20;
    return 60;
  }
  return 100;
}

function calculateLocationMatch(property, preferredLocations, savedSearches) {
  let score = 0;

  // Check against saved searches
  for (const search of savedSearches) {
    const keywords = search.filters?.location_keywords || [];
    if (keywords.some(kw => property.address?.includes(kw) || property.city?.includes(kw))) {
      score = 100;
      break;
    }
  }

  // Check preferred locations
  if (score === 0 && preferredLocations.length > 0) {
    if (preferredLocations.some(loc => property.city?.includes(loc) || property.state?.includes(loc))) {
      score = 80;
    }
  }

  return score || 50;
}

function calculateFeaturesMatch(property, savedSearches) {
  let matches = 0;
  let totalCriteria = 0;

  for (const search of savedSearches) {
    const filters = search.filters || {};
    if (!filters.amenities || filters.amenities.length === 0) continue;

    totalCriteria += filters.amenities.length;
    const propertyAmenities = property.amenities || [];

    filters.amenities.forEach(amenity => {
      if (propertyAmenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))) {
        matches++;
      }
    });
  }

  if (totalCriteria === 0) return 60;
  return Math.round((matches / totalCriteria) * 100);
}

function hasRecentViewing(propertyId, viewingHistory) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return viewingHistory.some(
    v => v.property_id === propertyId && new Date(v.viewed_date) > sevenDaysAgo
  );
}

function matchesSavedSearch(property, savedSearches) {
  for (const search of savedSearches) {
    const filters = search.filters || {};

    const priceMatch = !filters.price_min || !filters.price_max ||
      (property.price >= filters.price_min && property.price <= filters.price_max);

    const bedroomMatch = !filters.bedrooms_min || !filters.bedrooms_max ||
      (property.bedrooms >= filters.bedrooms_min && property.bedrooms <= filters.bedrooms_max);

    const bathroomMatch = !filters.bathrooms_min || !filters.bathrooms_max ||
      (property.bathrooms >= filters.bathrooms_min && property.bathrooms <= filters.bathrooms_max);

    if (priceMatch && bedroomMatch && bathroomMatch) {
      return 90;
    }
  }

  return 0;
}

function isNewListing(property) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return new Date(property.created_date) > oneWeekAgo;
}

function generateReason(scores, property) {
  const reasons = [];

  if (scores.price_match >= 80) {
    reasons.push('matches your price range');
  }

  if (scores.location_match >= 80) {
    reasons.push('in a preferred location');
  }

  if (scores.features_match >= 80) {
    reasons.push('has your desired features');
  }

  if (scores.saved_search_match > 0) {
    reasons.push('matches your saved search criteria');
  }

  if (isNewListing(property)) {
    reasons.push('newly listed on the market');
  }

  return `This property ${reasons.join(', ')}.`;
}