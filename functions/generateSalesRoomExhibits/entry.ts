import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { room_id } = await req.json();
    if (!room_id) return Response.json({ error: 'room_id required' }, { status: 400 });
    const room = await base44.asServiceRole.entities.SalesRoom.get(room_id);
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });

    const prompt = `You are a B2B sales intelligence assistant. Based on the following information about a sales prospect, generate tailored sales room content.

Company: ${room.company_name}
Contact: ${room.contact_name || 'Unknown'}
Pain Points: ${room.pain_points || 'Unknown'}
Gong Transcript: ${room.gong_transcript ? room.gong_transcript.substring(0, 3000) : 'Not provided'}

Generate as JSON: anticipated_questions (5-8 numbered questions), use_cases (3-5 titled blocks), security_governance (bullet points), ai_exhibits (title | insight, one per line).`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: 'object', properties: { anticipated_questions: { type: 'string' }, use_cases: { type: 'string' }, security_governance: { type: 'string' }, ai_exhibits: { type: 'string' } }, required: ['anticipated_questions','use_cases','security_governance','ai_exhibits'] }
    });
    await base44.asServiceRole.entities.SalesRoom.update(room_id, { anticipated_questions: result.anticipated_questions || '', use_cases: result.use_cases || '', security_governance: result.security_governance || '', ai_exhibits: result.ai_exhibits || '' });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});