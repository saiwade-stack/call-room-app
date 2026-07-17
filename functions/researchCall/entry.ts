import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let cardId = null;
  try {
    const body = await req.json();
    cardId = body.card_id;
    if (!cardId) return Response.json({ error: 'card_id required' }, { status: 400 });
    const card = await base44.asServiceRole.entities.CallCard.get(cardId);
    if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });
    if (!card.attendee_email) {
      await base44.asServiceRole.entities.CallCard.update(cardId, { research_status: 'Failed' });
      return Response.json({ error: 'No attendee email' }, { status: 400 });
    }
    await base44.asServiceRole.entities.CallCard.update(cardId, { research_status: 'Researching' });

    // HubSpot lookup
    let hubspotContext = '', hubspotContactId = '', hubspotCompanyId = '', hubspotUrl = '';
    try {
      const hsToken = Deno.env.get('HUBSPOT_API_KEY');
      if (hsToken) {
        let portalId = '', hubUiDomain = 'app.hubspot.com';
        try {
          const ar = await fetch('https://api.hubapi.com/account-info/v3/details', { headers: { Authorization: `Bearer ${hsToken}` } });
          if (ar.ok) { const ad = await ar.json(); portalId = String(ad.portalId||''); if (ad.uiDomain) hubUiDomain = ad.uiDomain; }
        } catch(_){}
        const contactRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
          method: 'POST', headers: { Authorization: `Bearer ${hsToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filterGroups:[{filters:[{propertyName:'email',operator:'EQ',value:card.attendee_email}]}], properties:['firstname','lastname','jobtitle','company','hs_linkedin_url','notes_last_contacted','lifecyclestage','message','hs_content_membership_notes','your_message','what_can_we_help_you_with','notes','content','description','how_can_we_help','reason_for_inquiry','city','state','country','hs_timezone','phone','mobilephone'], limit:1 })
        });
        if (contactRes.ok) {
          const cd = await contactRes.json();
          if (cd.results?.length > 0) {
            const c = cd.results[0]; const p = c.properties;
            hubspotContactId = c.id;
            if (portalId) hubspotUrl = `https://${hubUiDomain}/contacts/${portalId}/contact/${c.id}`;
            const inboundMessage = p.message||p.your_message||p.what_can_we_help_you_with||p.hs_content_membership_notes||p.notes||p.content||p.description||p.how_can_we_help||p.reason_for_inquiry||'';
            const locationStr = [p.city,p.state,p.country].filter(Boolean).join(', ');
            hubspotContext = `HubSpot Contact:\nName: ${p.firstname||''} ${p.lastname||''}\nTitle: ${p.jobtitle||'Unknown'}\nLifecycle: ${p.lifecyclestage||'Unknown'}\nLocation: ${locationStr||'Unknown'}\nTimezone: ${p.hs_timezone||'Unknown'}\nPhone: ${p.phone||p.mobilephone||'Unknown'}\n\nINBOUND MESSAGE FROM LEAD (MOST IMPORTANT):\n"""\n${inboundMessage||'No message provided'}\n"""`;
            const [assocRes] = await Promise.all([fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${c.id}/associations/companies`,{headers:{Authorization:`Bearer ${hsToken}`}})]);
            if (assocRes.ok) {
              const assocData = await assocRes.json();
              const companyId = assocData.results?.[0]?.id;
              if (companyId) {
                hubspotCompanyId = companyId;
                const compRes = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name,domain,industry,numberofemployees,annualrevenue,description,hs_lead_status`,{headers:{Authorization:`Bearer ${hsToken}`}});
                if (compRes.ok) { const cmp = (await compRes.json()).properties; hubspotContext += `\n\nHubSpot Company:\nName: ${cmp.name||''}\nIndustry: ${cmp.industry||'Unknown'}\nEmployees: ${cmp.numberofemployees||'Unknown'}\nRevenue: ${cmp.annualrevenue||'Unknown'}`; }
              }
            }
            try {
              const engRes = await fetch(`https://api.hubapi.com/engagements/v1/engagements/associated/CONTACT/${hubspotContactId}/paged?count=20`,{headers:{Authorization:`Bearer ${hsToken}`}});
              if (engRes.ok) {
                const engData = await engRes.json();
                const lines = (engData.results||[]).slice(0,15).map(eng=>{
                  const type=eng.engagement?.type||''; const ts=eng.engagement?.createdAt?new Date(eng.engagement.createdAt).toISOString().split('T')[0]:''; const m=eng.metadata||{};
                  if(type==='EMAIL') return `[Email ${ts}] "${m.subject||''}"`;
                  if(type==='NOTE') return `[Note ${ts}] ${(m.body||'').substring(0,150)}`;
                  if(type==='CALL') return `[Call ${ts}] ${m.durationMilliseconds?Math.round(m.durationMilliseconds/60000)+'min':''}`;
                  if(type==='MEETING') return `[Meeting ${ts}] "${m.title||''}"`;
                  return null;
                }).filter(Boolean);
                if (lines.length > 0) hubspotContext += `\n\nHubSpot Activity:\n${lines.join('\n')}`;
              }
            } catch(_){}
          } else { hubspotContext = 'HubSpot: Contact not found in CRM.'; }
        }
      }
    } catch(_){ hubspotContext=''; }

    // Gmail history
    let emailContext = 'Email History: No prior email history found.';
    try {
      const { accessToken: gmailToken } = await base44.asServiceRole.connectors.getConnection('gmail');
      const tRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent('from:'+card.attendee_email+' OR to:'+card.attendee_email)}&maxResults=5`,{headers:{Authorization:`Bearer ${gmailToken}`}});
      if (tRes.ok) {
        const tData = await tRes.json(); const threads = tData.threads||[];
        if (threads.length > 0) {
          const summaries = [];
          for (const t of threads.slice(0,4)) {
            const tr = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,{headers:{Authorization:`Bearer ${gmailToken}`}});
            if (tr.ok) { const td = await tr.json(); const h=td.messages?.[0]?.payload?.headers||[]; summaries.push(`• ${h.find(x=>x.name==='Date')?.value||''}: "${h.find(x=>x.name==='Subject')?.value||''}"`); }
          }
          if (summaries.length>0) emailContext = `Email History (${threads.length} threads):\n${summaries.join('\n')}`;
        }
      }
    } catch(_){}

    // AI Research
    const prompt = `You are a B2B sales intelligence assistant. Generate a pre-call brief.
MEETING: "${card.title}"
ATTENDEE EMAIL: ${card.attendee_email}
COMPANY DOMAIN: ${card.company_domain||'Unknown'}
${hubspotContext?hubspotContext+'\n\n':''}
${emailContext}

Return JSON: attendee_name, attendee_title, company_name, company_industry, company_size, linkedin_url, website_url, company_intel (2-3 paragraphs), company_revenue, company_serves, executive_team (bullet list), why_they_booked, enterprise_signal (Strong/Warm/Weak/Unknown), signal_rationale, opening_questions (3 numbered questions), email_history_summary, hubspot_activity_summary, inbound_message_raw (verbatim), inbound_message_summary, lead_location, lead_timezone`;

    const research = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, add_context_from_internet:true, model:'gemini_3_flash', response_json_schema:{type:'object',properties:{attendee_name:{type:'string'},attendee_title:{type:'string'},company_name:{type:'string'},company_industry:{type:'string'},company_size:{type:'string'},linkedin_url:{type:'string'},website_url:{type:'string'},company_intel:{type:'string'},why_they_booked:{type:'string'},enterprise_signal:{type:'string'},signal_rationale:{type:'string'},opening_questions:{type:'string'},company_revenue:{type:'string'},company_serves:{type:'string'},executive_team:{type:'string'},email_history_summary:{type:'string'},hubspot_activity_summary:{type:'string'},inbound_message_raw:{type:'string'},inbound_message_summary:{type:'string'},lead_location:{type:'string'},lead_timezone:{type:'string'}},required:['attendee_name','enterprise_signal','opening_questions']} });

    const validSignals = ['Strong','Warm','Weak','Unknown'];
    const updates = { research_status:'Ready', attendee_name:research.attendee_name||card.attendee_name||'', attendee_title:research.attendee_title||'', company_name:research.company_name||card.company_name||'', company_industry:research.company_industry||'', company_size:research.company_size||'', linkedin_url:research.linkedin_url||'', website_url:research.website_url||'', company_intel:research.company_intel||'', why_they_booked:research.why_they_booked||'', enterprise_signal:validSignals.includes(research.enterprise_signal)?research.enterprise_signal:'Unknown', signal_rationale:research.signal_rationale||'', opening_questions:research.opening_questions||'', company_revenue:research.company_revenue||'', company_serves:research.company_serves||'', executive_team:research.executive_team||'', email_history_summary:research.email_history_summary||emailContext, hubspot_activity_summary:research.hubspot_activity_summary||'', inbound_message_raw:research.inbound_message_raw||'', inbound_message_summary:research.inbound_message_summary||'', lead_location:research.lead_location||'', lead_timezone:research.lead_timezone||'' };
    if (hubspotContactId) updates.hubspot_contact_id = hubspotContactId;
    if (hubspotCompanyId) updates.hubspot_company_id = hubspotCompanyId;
    if (hubspotUrl) updates.hubspot_url = hubspotUrl;
    await base44.asServiceRole.entities.CallCard.update(cardId, updates);
    return Response.json({ success:true, card_id:cardId, signal:updates.enterprise_signal });
  } catch(error) {
    if (cardId) { try { await base44.asServiceRole.entities.CallCard.update(cardId,{research_status:'Failed'}); }catch(_){} }
    return Response.json({ error:error.message },{ status:500 });
  }
});