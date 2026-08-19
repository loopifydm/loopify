(function(){
  const stages=['new','contacted','qualified','proposal','won'];
  const labels={new:'New Leads',contacted:'Contacted',qualified:'Qualified',proposal:'Proposal',won:'Won'};
  const colors={new:'#2563eb',contacted:'#7c3aed',qualified:'#0891b2',proposal:'#ea580c',won:'#16a34a'};
  const esc2=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money2=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  const norm=s=>String(s||'new').toLowerCase();
  function funnel(all){
    const counts=Object.fromEntries(stages.map(s=>[s,all.filter(x=>norm(x.stage)===s).length]));
    const values=Object.fromEntries(stages.map(s=>[s,all.filter(x=>norm(x.stage)===s).reduce((a,x)=>a+Number(x.value||0),0)]));
    const total=all.length,won=counts.won||0,lost=all.filter(x=>norm(x.stage)==='lost').length;
    const rate=(a,b)=>a?((b/a)*100).toFixed(1)+'%':'—';
    return `<div class="lead-funnel-grid">${stages.map((s,i)=>{const pct=total?Math.max(34,(counts[s]/total)*100):34;const prev=i?counts[stages[i-1]]:total;return `<button type="button" class="funnel-stage" style="width:${pct}%;border-color:${colors[s]}33" onclick="window.leadFunnelFilter('${s}')"><div class="funnel-top"><span>${labels[s]}</span><strong>${counts[s]}</strong></div><div class="funnel-bar" style="background:${colors[s]}"></div><div class="funnel-bottom"><span>${values[s]?money2(values[s]):'₹0'} pipeline</span><b>${i===0?rate(total,counts[s]):rate(prev,counts[s])}</b></div></button>`}).join('')}<div class="funnel-summary"><div><span>Total Leads</span><b>${total}</b></div><div><span>Won</span><b>${won}</b></div><div><span>Win Rate</span><b>${rate(total,won)}</b></div><div><span>Lost</span><b>${lost}</b></div></div></div>`;
  }
  function renderLeadCRM(){
    const all=state.leads||[];
    const sourceMap={};all.forEach(x=>{const k=x.source||'Unknown';sourceMap[k]=(sourceMap[k]||0)+1;});
    const sources=Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const table=typeof leadTable==='function'?leadTable(all):'<div class="tag">No leads available.</div>';
    const el=document.querySelector('#view');if(!el)return;
    el.innerHTML=head('Lead CRM','Manage prospects, follow-ups and conversions.','openEntity(\"leads\")')+
      `<section class="cards lead-kpis"><div class="card metric"><span>Total Leads</span><strong>${all.length}</strong><small>All captured prospects</small></div><div class="card metric"><span>Qualified</span><strong>${all.filter(x=>norm(x.stage)==='qualified').length}</strong><small>Sales-ready opportunities</small></div><div class="card metric"><span>Proposals</span><strong>${all.filter(x=>norm(x.stage)==='proposal').length}</strong><small>Active opportunities</small></div><div class="card metric"><span>Won</span><strong>${all.filter(x=>norm(x.stage)==='won').length}</strong><small>Converted clients</small></div></section>
      <div class="panel lead-funnel-panel"><div class="panel-head"><div><h2>Lead Conversion Funnel</h2><div class="tag">New → Contacted → Qualified → Proposal → Won</div></div><button type="button" class="secondary" onclick="openEntity('leads')">+ Add Lead</button></div>${funnel(all)}</div>
      <section class="grid lead-funnel-lower"><div class="panel"><div class="panel-head"><div><h2>Lead Sources</h2><div class="tag">Where your leads come from</div></div></div><div class="source-list">${sources.length?sources.map(([s,n])=>`<div><span>${esc2(s)}</span><div class="source-track"><i style="width:${Math.max(4,all.length?(n/all.length)*100:4)}%"></i></div><b>${n}</b></div>`).join(''):'<div class="tag">No lead sources recorded yet.</div>'}</div></div><div class="panel"><div class="panel-head"><div><h2>Funnel Health</h2><div class="tag">Stage-to-stage conversion</div></div></div><div class="health-list">${stages.slice(1).map((s,i)=>{const prev=stages[i],a=all.filter(x=>norm(x.stage)===prev).length,b=all.filter(x=>norm(x.stage)===s).length;return `<div><span>${labels[prev]} → ${labels[s]}</span><b>${a?((b/a)*100).toFixed(1)+'%':'—'}</b></div>`}).join('')}</div></div></section>
      <div id="leadFunnelTable" class="panel"><div class="panel-head"><div><h2>Lead Pipeline</h2><div class="tag">Use the stage filter or click a funnel stage</div></div><div class="toolbar" style="margin:0"><select id="leadFilter" onchange="window.leadFunnelFilter(this.value)"><option value="">All stages</option>${['new','contacted','qualified','proposal','won','lost'].map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div></div><div id="leadsTable">${table}</div></div>`;
  }
  window.leadFunnelFilter=function(stage){
    const all=state.leads||[];const filtered=stage?all.filter(x=>norm(x.stage)===stage):all;
    const table=document.querySelector('#leadsTable');if(table&&typeof leadTable==='function')table.innerHTML=leadTable(filtered);
    const sel=document.querySelector('#leadFilter');if(sel)sel.value=stage||'';
  };
  window.leads=renderLeadCRM;
  function patchNavigation(){
    document.querySelectorAll('[data-nav="leads"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();state.section='leads';renderLeadCRM();};});
  }
  const style=document.createElement('style');style.textContent=`.lead-funnel-panel{margin-top:16px}.lead-funnel-grid{display:flex;flex-direction:column;gap:8px;align-items:center;padding:10px 0 4px}.funnel-stage{border:1px solid;background:#fff;border-radius:12px;padding:12px 16px;text-align:left;cursor:pointer;transition:.18s;box-shadow:0 5px 18px #0b1d3b08}.funnel-stage:hover{transform:translateY(-1px);box-shadow:0 10px 24px #0b1d3b12}.funnel-top,.funnel-bottom{display:flex;justify-content:space-between;align-items:center;gap:12px}.funnel-top span{font-size:12px;font-weight:700}.funnel-top strong{font-size:22px}.funnel-bar{height:6px;border-radius:99px;margin:8px 0;opacity:.9}.funnel-bottom span,.funnel-bottom b{font-size:10px;color:var(--muted)}.funnel-bottom b{color:var(--ink)}.funnel-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px;width:100%}.funnel-summary div{padding:12px;border:1px solid var(--line);border-radius:10px;background:#fafbfd}.funnel-summary span{display:block;color:var(--muted);font-size:10px}.funnel-summary b{display:block;font-size:20px;margin-top:4px}.lead-funnel-lower{margin-top:16px}.source-list,.health-list{display:grid;gap:13px}.source-list>div{display:grid;grid-template-columns:110px 1fr 28px;gap:10px;align-items:center}.source-list span,.health-list span{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.source-track{height:8px;background:#edf1f7;border-radius:99px;overflow:hidden}.source-track i{display:block;height:100%;background:var(--blue);border-radius:99px}.source-list b,.health-list b{font-size:11px}.health-list>div{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--line)}.lead-kpis{margin-bottom:0}@media(max-width:700px){.funnel-stage{width:100%!important}.funnel-summary{grid-template-columns:repeat(2,1fr)}.lead-funnel-lower{grid-template-columns:1fr}.source-list>div{grid-template-columns:85px 1fr 24px}}`;document.head.appendChild(style);
  setInterval(patchNavigation,1000);setTimeout(patchNavigation,100);
})();
