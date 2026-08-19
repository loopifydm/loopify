// Loopify ERP email workflows: Gmail invoice delivery + Resend fallback workflows.
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
  window.connectGmail=()=>{location.href=`${SUPABASE_URL}/functions/v1/gmail-oauth-start`};
  window.emailInvoice=async id=>{const x=state.invoices.find(i=>i.id===id);if(!x)return;const email=clientEmail(x.client_id);if(!email)return alert('This client does not have an email address.');if(!confirm(`Send invoice ${x.invoice_number||''} to the client?\n\nRecipient: ${email}\n\nThe invoice will be sent directly from your connected Gmail account.`))return;try{const r=await invoke('invoice',{invoice:x,client:{name:clientName(x.client_id),email}},'gmail-send');alert(`Invoice sent successfully.\n\nDelivered to: ${r.delivered_to||email}`);}catch(e){alert('Unable to send invoice email: '+(e.message||e));}};
  window.sendContentApproval=async id=>{const x=state.content.find(c=>c.id===id);if(!x)return;const email=clientEmail(x.client_id);if(!email)return alert('This client does not have an email address.');if(!confirm(`Send content approval as a test email?\n\nIt will be delivered to your ERP administrator email.\nIntended client: ${email}`))return;try{const r=await invoke('content_approval',{content:x,client:{name:clientName(x.client_id),email},app_url:location.origin+location.pathname});alert(`Approval test email sent successfully.\n\nDelivered to: ${r.delivered_to||'your administrator email'}`);}catch(e){alert('Unable to send approval email: '+(e.message||e));}};
  window.sendWeeklyReport=async()=>{if(!confirm('Send the weekly report as a test email to your ERP administrator email?'))return;const week=new Date();const summary={clients:state.clients.length,tasks:state.tasks.length,content:state.content.length,leads:state.leads.length,campaigns:state.campaigns.length,invoices:state.invoices.length};try{const r=await invoke('weekly_report',{week_ending:week.toISOString().slice(0,10),summary});alert(`Weekly report test email sent successfully.\n\nDelivered to: ${r.delivered_to||'your administrator email'}`);}catch(e){alert('Unable to send weekly report: '+(e.message||e));}};
  const addAction=(cell,label,onclick,key,cls='icon-btn')=>{if(!cell||cell.querySelector(`[data-email-action="${key}"]`))return;const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.dataset.emailAction=key;b.onclick=onclick;cell.appendChild(b);};
  const patchTables=()=>{
    if(state.section==='finance'){
      const topUser=document.querySelector('#view .top .user');
      if(topUser&&!topUser.querySelector('[data-gmail-connect]')){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Connect Gmail';b.dataset.gmailConnect='1';b.onclick=connectGmail;topUser.insertBefore(b,topUser.firstChild);}
      document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]invoices['"],['"]([^'"]+)/);if(m)addAction(edit.parentElement,'Email',()=>emailInvoice(m[1]),'invoice-'+m[1]);});
    }
    if(state.section==='content')document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]content['"],['"]([^'"]+)/);if(m){const x=state.content.find(a=>a.id===m[1]);if(x?.status==='review')addAction(edit.parentElement,'Approval Email',()=>sendContentApproval(m[1]),'approval-'+m[1]);}});
    if(state.section==='reports'&&!document.querySelector('[data-weekly-report-email]')){const top=document.querySelector('#view .top .user');if(top){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Email Weekly Report';b.dataset.weeklyReportEmail='1';b.onclick=sendWeeklyReport;top.insertBefore(b,top.firstChild);}}
  };
  const q=new URLSearchParams(location.search);if(q.get('gmail')==='connected'){alert('Gmail connected successfully. Invoice emails can now be sent directly to clients.');history.replaceState({},'',location.pathname);}
  const observer=new MutationObserver(patchTables);observer.observe(document.body,{childList:true,subtree:true});setTimeout(patchTables,700);
})();
