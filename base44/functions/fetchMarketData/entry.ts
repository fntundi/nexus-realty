import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { property_id, address, zip_code } = await req.json();

    if (!address && !property_id) {
      return Response.json({ error: 'Property ID or address required' }, { status: 400 });
    }

    // Get market data configuration
    const configs = await base44.asServiceRole.entities.MarketDataConfig.filter({ is_enabled: true });
    
    if (configs.length === 0) {
      return Response.json({ 
        error: 'Market data integration not enabled',
        message: 'Configure API keys in Market Data Settings to enable this feature'
      }, { status: 503 });
    }

    const config = configs[0];

    // Check rate limits
    const today = new Date().toISOString().split('T')[0];
    if (config.last_reset_date !== today) {
      await base44.asServiceRole.entities.MarketDataConfig.update(config.id, {
        calls_today: 0,
        last_reset_date: today
      });
      config.calls_today = 0;
    }

    if (config.calls_today >= config.rate_limit_per_day) {
      return Response.json({ 
        error: 'Rate limit exceeded',
        message: 'Daily API limit reached. Try again tomorrow.'
      }, { status: 429 });
    }

    // Check cache first
    let cachedData = null;
    if (property_id) {
      const cached = await base44.asServiceRole.entities.CachedMarketData.filter({ property_id });
      if (cached.length > 0) {
        const cache = cached[0];
        const expiresDate = new Date(cache.expires_date);
        if (expiresDate > new Date()) {
          return Response.json({
            success: true,
            data: cache,
            from_cache: true
          });
        }
      }
    }

    // Fetch from API (placeholder - implement based on provider)
    const marketData = await fetchFromProvider(config, address, zip_code);

    // Update rate limit counter
    await base44.asServiceRole.entities.MarketDataConfig.update(config.id, {
      calls_today: config.calls_today + 1
    });

    // Cache the result
    const expiresDate = new Date();
    expiresDate.setHours(expiresDate.getHours() + config.cache_duration_hours);

    const cachedRecord = await base44.asServiceRole.entities.CachedMarketData.create({
      property_id: property_id || null,
      address: address,
      estimated_value: marketData.estimated_value,
      value_range_low: marketData.value_range_low,
      value_range_high: marketData.value_range_high,
      price_per_sqft: marketData.price_per_sqft,
      market_trends: marketData.market_trends,
      neighborhood_stats: marketData.neighborhood_stats,
      comparable_sales: marketData.comparable_sales || [],
      fetched_date: new Date().toISOString(),
      expires_date: expiresDate.toISOString(),
      provider: config.provider
    });

    return Response.json({
      success: true,
      data: cachedRecord,
      from_cache: false
    });

  } catch (error) {
    console.error('Error fetching market data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchFromProvider(config, address, zip_code) {
  // This is a placeholder function that will be implemented based on the provider
  // When API keys are configured, this will make actual API calls
  
  const provider = config.provider;

  if (!config.api_key) {
    throw new Error('API key not configured');
  }

  // Placeholder implementation - replace with actual API calls
  switch (provider) {
    case 'zillow':
      return await fetchFromZillow(config, address, zip_code);
    case 'redfin':
      return await fetchFromRedfin(config, address, zip_code);
    case 'realtor':
      return await fetchFromRealtor(config, address, zip_code);
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }
}

async function fetchFromZillow(config, address, zip_code) {
  // TODO: Implement Zillow API integration
  // Example endpoint: https://api.zillow.com/webservice/GetZestimate.htm
  
  const response = await fetch(`${config.api_url}/GetZestimate?address=${encodeURIComponent(address)}&api_key=${config.api_key}`);
  
  if (!response.ok) {
    throw new Error(`Zillow API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    estimated_value: data.zestimate?.amount || 0,
    value_range_low: data.zestimate?.valuationRange?.low || 0,
    value_range_high: data.zestimate?.valuationRange?.high || 0,
    price_per_sqft: data.pricePerSqFt || 0,
    market_trends: {
      median_price: data.localMarketData?.medianPrice || 0,
      price_change_30d: data.localMarketData?.priceChange30Days || 0,
      price_change_12m: data.localMarketData?.priceChange12Months || 0,
      days_on_market_avg: data.localMarketData?.avgDaysOnMarket || 0,
      inventory_count: data.localMarketData?.inventory || 0
    },
    neighborhood_stats: {
      median_home_value: data.neighborhood?.medianValue || 0,
      median_rent: data.neighborhood?.medianRent || 0,
      property_tax_rate: data.neighborhood?.taxRate || 0,
      school_rating_avg: data.neighborhood?.schoolRating || 0,
      walkability_score: data.neighborhood?.walkScore || 0,
      crime_rate: data.neighborhood?.crimeRate || 'moderate'
    },
    comparable_sales: data.comps || []
  };
}

async function fetchFromRedfin(config, address, zip_code) {
  // TODO: Implement Redfin API integration
  throw new Error('Redfin integration not yet implemented');
}

async function fetchFromRealtor(config, address, zip_code) {
  // TODO: Implement Realtor.com API integration
  throw new Error('Realtor.com integration not yet implemented');
}