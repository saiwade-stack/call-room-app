import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const profile = await profileRes.json();
    const myDomain = ((profile.email || '').split('@')[1] || '').toLowerCase();

    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const calUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(endDate.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=100`;
    const calRes = await fetch(calUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!calRes.ok) { const err = await calRes.text(); return Response.json({ error: 'Calendar API error', details: err }, { status: 500 }); }

    const calData = await calRes.json();
    const events = calData.items || [];
    let created = 0, skipped = 0;
    const newCardIds = [];

    for (const event of events) {
      if (!event.start?.dateTime) { skipped++; continue; }
      if (event.status === 'cancelled') { skipped++; continue; }
      if ((event.summary || '').toLowerCase().includes('project')) { skipped++; continue; }
      const attendees = event.attendees || [];
      if (attendees.length === 0) { skipped++; continue; }
      const external = attendees.filter((a) => {
        if (a.self) return false;
        const domain = (a.email || '').split('@')[1]?.toLowerCase();
        return domain && domain !== myDomain;
      });
      if (external.length === 0) { skipped++; continue; }
      const existing = await base44.asServiceRole.entities.CallCard.filter({ event_id: event.id });
      if (existing.length > 0) { skipped++; continue; }
      const primary = external[0];
      const attendeeEmail = primary.email || '';
      const attendeeDomain = attendeeEmail.split('@')[1] || '';
      const rawCompany = attendeeDomain.split('.')[0] || '';
      const companyName = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1);
      let rsvpStatus = 'awaiting';
      if (primary.responseStatus === 'accepted') rsvpStatus = 'accepted';
      else if (primary.responseStatus === 'tentative') rsvpStatus = 'tentative';
      const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || '';
      const card = await base44.asServiceRole.entities.CallCard.create({ event_id: event.id, title: event.summary || 'Meeting', start_time: event.start.dateTime, end_time: event.end?.dateTime || event.start.dateTime, meet_link: meetLink, attendee_email: attendeeEmail, attendee_name: primary.displayName || attendeeEmail.split('@')[0], company_domain: attendeeDomain, company_name: companyName, rsvp_status: rsvpStatus, enterprise_signal: 'Unknown', status: 'Upcoming', research_status: 'Pending' });
      newCardIds.push(card.id);
      created++;
    }

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const syncTime = new Date().toISOString();
    if (settingsList.length > 0) {
      await base44.asServiceRole.entities.AppSettings.update(settingsList[0].id, { last_sync: syncTime, internal_domain: myDomain });
    } else {
      await base44.asServiceRole.entities.AppSettings.create({ last_sync: syncTime, sync_enabled: true, research_depth: 'quick', internal_domain: myDomain });
    }
    return Response.json({ success: true, created, skipped, total: events.length, new_card_ids: newCardIds });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});