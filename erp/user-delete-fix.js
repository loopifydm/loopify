(function(){
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  window.deletePortalUser=async function(id,name,btn){
    if(!id)return;
    if(!confirm('Delete '+(name||'this user')+'?\n\nThis will permanently remove the login account. Any clients assigned to this employee will become unassigned.'))return;
    if(btn){btn.disabled=true;btn.textContent='Deleting...';}
    try{
      const {data,error}=await db.functions.invoke('delete-user-v1',{body:{user_id:id}});
      if(error)throw new Error(error.message||'Could not delete account.');
      if(data?.error)throw new Error(data.error);
      await refresh();
      render();
      alert('User deleted successfully.');
    }catch(e){
      alert('Unable to delete user: '+(e.message||e));
      if(btn){btn.disabled=false;btn.textContent='Delete';}
    }
  };
  function addButtons(){
    if(!window.state||state.section!=='users')return;
    const view=document.querySelector('#view');
    const tables=view?.querySelectorAll('.table-wrap table');
    const table=tables?.[0];
    if(!table||table.dataset.deleteReady==='1')return;
    const head=table.querySelector('thead tr');
    if(head){const th=document.createElement('th');th.textContent='Actions';head.appendChild(th);}
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<1)return;
      const name=cells[0]?.innerText?.trim()||'this user';
      const email=cells[1]?.innerText?.trim()||'';
      const profile=(state.profiles||[]).find(p=>String(p.full_name||'').trim()===name && String(p.email||'').trim()===email) || (state.profiles||[]).find(p=>String(p.full_name||'').trim()===name);
      const td=document.createElement('td');
      if(profile){
        const b=document.createElement('button');
        b.className='secondary';
        b.style.cssText='color:#b42318;border-color:#f3b7b2;padding:7px 12px;font-size:12px;';
        b.textContent='Delete';
        b.onclick=()=>deletePortalUser(profile.id,name,b);
        if(profile.id===state.user?.id){b.disabled=true;b.title='You cannot delete your own account';}
        td.appendChild(b);
      }else td.textContent='-';
      tr.appendChild(td);
    });
    table.dataset.deleteReady='1';
  }
  const obs=new MutationObserver(()=>setTimeout(addButtons,0));
  function start(){const v=document.querySelector('#view');if(v)obs.observe(v,{childList:true,subtree:true});addButtons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
