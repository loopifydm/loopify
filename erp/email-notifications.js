// Loopify ERP email workflows: Gmail invoice delivery + direct client approval + weekly reports.
(function(){
  const clientEmail=id=>state.clients.find(c=>c.id===id)?.email||'';
  const clientName=id=>state.clients.find(c=>c.id===id)?.name||'Client';
  const invoke=async(type,payload,fn='send-email-free')=>{
    const {data:{session},error:sessionError}=await db.auth.getSession();
    if(sessionError||!session?.access_token) throw new Error('Your ERP login session has expired. Please sign out and sign in again.');
    const res=await fetch(`${SUPABASE_URL}/functions/v1/${fn}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({type,...payload})});
    let data={};try{data=await res.json();}catch(_){data={};}
    if(!res.ok)throw new Error(data?.error||data?.message||`Email service returned HTTP ${res.status}.`);
    if(data?.error)throw new Error(data.error);return data;
  };
  const inLast7Days=x=>{const d=x?.created_at?new Date(x.created_at):null;if(!d||Number.isNaN(d.getTime()))return true;return Date.now()-d.getTime()<=7*24*60*60*1000;};
  window.connectGmail=()=>{location.href=`${SUPABASE_URL}/functions/v1/gmail-oauth-start`};
  window.emailInvoice=async id=>{const x=state.invoices.find(i=>i.id===id);if(!x)return;const email=clientEmail(x.client_id);if(!email)return alert('This client does not have an email address.');if(!confirm(`Send invoice ${x.invoice_number||''} to the client?\n\nRecipient: ${email}\n\nThe invoice will be sent directly from your connected Gmail account.`))return;try{const r=await invoke('invoice',{invoice:x,client:{name:clientName(x.client_id),email}},'gmail-send');alert(`Invoice sent successfully.\n\nDelivered to: ${r.delivered_to||email}`);}catch(e){alert('Unable to send invoice email: '+(e.message||e));}};
  window.sendContentApproval=async id=>{
    const x=state.content.find(c=>c.id===id);if(!x)return;
    const email=clientEmail(x.client_id);if(!email)return alert('This client does not have an email address.');
    if(String(x.status||'').toLowerCase()!=='review')return alert('Only content in Review status can be sent for approval.');
    if(!confirm(`Send content approval request?\n\nClient: ${clientName(x.client_id)}\nRecipient: ${email}\n\nThe approval email will be delivered to the client when Gmail is connected.`))return;
    try{
      const r=await invoke('content_approval',{content:x,client:{name:clientName(x.client_id),email},app_url:location.origin+location.pathname});
      if(r?.test_mode)return alert(`Approval email is still in test mode.\n\nIt was delivered to the administrator instead of the client.\n\nConnect Gmail in Finance and send again to deliver directly to ${email}.`);
      alert(`Approval email sent successfully.\n\nClient: ${clientName(x.client_id)}\nDelivered to: ${r.delivered_to||email}`);
    }catch(e){alert('Unable to send approval email: '+(e.message||e));}
  };
  window.sendWeeklyReport=async()=>{if(!confirm('Send the weekly report as a test email to your ERP administrator email?'))return;const week=new Date();const summary={clients:state.clients.length,tasks:state.tasks.length,content:state.content.length,leads:state.leads.length,campaigns:state.campaigns.length,invoices:state.invoices.length};try{const r=await invoke('weekly_report',{week_ending:week.toISOString().slice(0,10),summary});alert(`Weekly report test email sent successfully.\n\nDelivered to: ${r.delivered_to||'your administrator email'}`);}catch(e){alert('Unable to send weekly report: '+(e.message||e));}};
  window.sendClientWeeklyReport=async clientId=>{
    const client=state.clients.find(c=>c.id===clientId);if(!client)return;
    const email=client.email||'';if(!email)return alert(`${client.name||'This client'} does not have an email address.`);
    const leads=state.leads.filter(x=>x.client_id===clientId&&inLast7Days(x));
    const campaigns=state.campaigns.filter(x=>x.client_id===clientId&&inLast7Days(x));
    const tasks=state.tasks.filter(x=>x.client_id===clientId&&inLast7Days(x));
    const content=state.content.filter(x=>x.client_id===clientId&&inLast7Days(x));
    const invoices=state.invoices.filter(x=>x.client_id===clientId);
    const summary={client_name:client.name,client_email:email,clients:1,leads:leads.length,campaigns:campaigns.length,tasks:tasks.length,tasks_completed:tasks.filter(x=>['approved','published','completed','done'].includes(String(x.status||'').toLowerCase())).length,content:content.length,content_published:content.filter(x=>String(x.status||'').toLowerCase()==='published').length,invoices:invoices.length,campaign_leads:campaigns.reduce((a,x)=>a+Number(x.leads||0),0)};
    if(!confirm(`Send weekly performance report to ${client.name}?\n\nRecipient: ${email}\n\nThe report will include leads, campaigns, tasks, completed tasks, content and campaign lead results.`))return;
    try{const r=await invoke('weekly_report',{week_ending:new Date().toISOString().slice(0,10),summary,recipient:email});alert(`Client weekly report sent successfully.\n\nClient: ${client.name}\nDelivered to: ${r.delivered_to||email}`);}catch(e){alert('Unable to send client weekly report: '+(e.message||e));}
  };
  const addAction=(cell,label,onclick,key,cls='icon-btn')=>{if(!cell||cell.querySelector(`[data-email-action="${key}"]`))return;const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.dataset.emailAction=key;b.onclick=onclick;cell.appendChild(b);};
  const patchTables=()=>{
    if(state.section==='finance'){
      const topUser=document.querySelector('#view .top .user');
      if(topUser&&!topUser.querySelector('[data-gmail-connect]')){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Connect Gmail';b.dataset.gmailConnect='1';b.onclick=connectGmail;topUser.insertBefore(b,topUser.firstChild);}
      document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]invoices['"],['"]([^'"]+)/);if(m)addAction(edit.parentElement,'Email',()=>emailInvoice(m[1]),'invoice-'+m[1]);});
    }
    if(state.section==='clients')document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]clients['"],['"]([^'"]+)/);if(m)addAction(edit.parentElement,'Report',()=>sendClientWeeklyReport(m[1]),'client-report-'+m[1]);});
    if(state.section==='content')document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]content['"],['"]([^'"]+)/);if(m){const x=state.content.find(a=>a.id===m[1]);if(x?.status==='review')addAction(edit.parentElement,'Send Approval',()=>sendContentApproval(m[1]),'approval-'+m[1]);}});
    if(state.section==='reports'&&!document.querySelector('[data-weekly-report-email]')){const top=document.querySelector('#view .top .user');if(top){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Email Weekly Report';b.dataset.weeklyReportEmail='1';b.onclick=sendWeeklyReport;top.insertBefore(b,top.firstChild);}}
  };
  const q=new URLSearchParams(location.search);if(q.get('gmail')==='connected'){alert('Gmail connected successfully. Invoice and client approval emails can now be sent directly to clients.');history.replaceState({},'',location.pathname);}
  const observer=new MutationObserver(patchTables);observer.observe(document.body,{childList:true,subtree:true});setTimeout(patchTables,700);
})();
