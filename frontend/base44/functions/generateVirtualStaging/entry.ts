import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, room_name, original_image_url, staging_style } = await req.json();

    // Create staging record with pending status
    const staging = await base44.entities.VirtualStaging.create({
      property_id,
      room_name,
      original_image_url,
      staging_style: staging_style || 'luxury',
      generation_status: 'processing',
      created_by_email: user.email
    });

    // Generate AI-staged image
    try {
      const prompt = `You are an expert interior staging AI. Transform this room photo to show the space staged in a ${staging_style} style. Make the room look appealing, bright, and well-furnished. Keep the room structure the same but add virtual furniture, decor, and lighting improvements.`;

      const imageResponse = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: [original_image_url]
      });

      if (imageResponse.url) {
        // Update staging with generated image
        await base44.entities.VirtualStaging.update(staging.id, {
          staged_image_url: imageResponse.url,
          generation_status: 'completed'
        });

        return Response.json({
          success: true,
          staging_id: staging.id,
          staged_image_url: imageResponse.url
        });
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error) {
      // Update status to failed
      await base44.entities.VirtualStaging.update(staging.id, {
        generation_status: 'failed',
        generation_error: error.message
      });

      return Response.json({
        success: false,
        error: 'Image generation failed',
        staging_id: staging.id
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});