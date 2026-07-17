import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const upcoming = await base44.asServiceRole.entities.CallCard.filter({ status: 'Upcoming' });
    const live = await base44.asServiceRole.entities.CallCard.filter({ status: 'Live' });
    const allActive = [...upcoming, ...live];
    let nextCall = null, hasLive = false;

    for (const card of allActive) {
      if (!card.start_time) continue;
      const start = new Date(card.start_time);
      const end = card.end_time ? new Date(card.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
      if (now >= start && now <= end) {
        hasLive = true;
        if (card.status !== 'Live') await base44.asServiceRole.entities.CallCard.update(card.id, { status: 'Live' });
      } else if (now > end) {
        await base44.asServiceRole.entities.CallCard.update(card.id, { status: 'Completed' });
      } else if (now < start) {
        if (!nextCall || start < new Date(nextCall.start_time)) {
          nextCall = { id: card.id, title: card.title, start_time: card.start_time, meet_link: card.meet_link, attendee_name: card.attendee_name };
        }
      }
    }
    return Response.json({ hasLive, nextCall });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});