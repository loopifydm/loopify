// Loopify ERP email workflows: invoice, weekly report and content approval.
(function(){
  const clientEmail=id=>state.clients.find(c=>c.id===id)?.email||'';
  const clientName=id=>state.clients.find(c=>c.id===id)?.name||'Client';
  const invoke=async(type,payload)=>{
    const {data:{session}}=await db.auth.getSession();
    if(!session?.access_token) throw new Error('Your ERP login session has expired. Please sign out and sign in again.');
    const {data,error}=await db.functions.invoke('send-email',{
      body:{type,...payload},
      headers:{Authorization:`Bearer ${session.access_token}`}
    });
    if(error) throw new Error(data?.error||error.message||'Email service error');
    if(data?.error) throw new Error(data.error);
    return data;
  };
  window.emailInvoice=async id=>{const x=state.invoices.find(i=>i.id===id);if(!x)return;const email=clientEmail(x.client_id);if(!email)return alert('This client does not have an email address.');if(!confirm(`Send invoice ${x.invoice_number||''} to ${email}?`))return;try{await invoke('invoice',{invoice:x,client:{name:clientName(x.client_id),email}});alert('Invoice email sent successfully.');}catch(e){alert('Unable to send invoice email: '+(e.message||e));}};
  window.sendContentApproval=async id=>{const x=state.content.find(c=>c.id===id);if(!x)return;const email=clientEmail(x.client_id);if(!email)return alert('This client does not have an email address.');if(!confirm(`Send content approval request to ${email}?`))return;try{await invoke('content_approval',{content:x,client:{name:clientName(x.client_id),email},app_url:location.origin+location.pathname});alert('Approval email sent successfully.');}catch(e){alert('Unable to send approval email: '+(e.message||e));}};
  window.sendWeeklyReport=async()=>{const email=prompt('Enter the email address for the weekly report:',state.profile?.email||'');if(!email)return;const week=new Date();const summary={clients:state.clients.length,tasks:state.tasks.length,content:state.content.length,leads:state.leads.length,campaigns:state.campaigns.length,invoices:state.invoices.length};try{await invoke('weekly_report',{recipient:email,week_ending:week.toISOString().slice(0,10),summary});alert('Weekly report sent successfully.');}catch(e){alert('Unable to send weekly report: '+(e.message||e));}};
  const addAction=(cell,label,onclick,key)=>{if(!cell||cell.querySelector(`[data-email-action="${key}"]`))return;const b=document.createElement('button');b.type='button';b.className='icon-btn';b.textContent=label;b.dataset.emailAction=key;b.onclick=onclick;cell.appendChild(b);};
  const patchTables=()=>{
    if(state.section==='finance')document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]invoices['"],['"]([^'"]+)/);if(m)addAction(edit.parentElement,'Email',()=>emailInvoice(m[1]),'invoice-'+m[1]);});
    if(state.section==='content')document.querySelectorAll('button').forEach(edit=>{const m=edit.getAttribute('onclick')?.match(/editEntity\(['"]content['"],['"]([^'"]+)/);if(m){const x=state.content.find(a=>a.id===m[1]);if(x?.status==='review')addAction(edit.parentElement,'Approval Email',()=>sendContentApproval(m[1]),'approval-'+m[1]);}});
    if(state.section==='reports'&&!document.querySelector('[data-weekly-report-email]')){const top=document.querySelector('#view .top .user');if(top){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Email Weekly Report';b.dataset.weeklyReportEmail='1';b.onclick=sendWeeklyReport;top.insertBefore(b,top.firstChild);}}
  };
  const observer=new MutationObserver(patchTables);observer.observe(document.body,{childList:true,subtree:true});setTimeout(patchTables,700);
})();
