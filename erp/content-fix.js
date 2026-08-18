// Reliable Content Calendar module for the Loopify ERP.
(function(){
  const contentDB=db;
  const originalOpenEntity=window.openEntity;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const toast=m=>window.toast?window.toast(m):alert(m);

  window.openEntity=async function(type,id=null){
    if(type!=='content') return originalOpenEntity(type,id);
    const [{data:auth},{data:clients,error:ce},{data:profiles,error:pe}]=await Promise.all([
      contentDB.auth.getUser(),contentDB.from('clients').select('id,name').order('name'),contentDB.from('profiles').select('id,full_name,email').order('full_name')
    ]);
    if(ce||pe) return toast((ce||pe).message);
    let item=null;
    if(id){const r=await contentDB.from('content_items').select('*').eq('id',id).single();if(r.error)return toast(r.error.message);item=r.data;}
    const options=(arr,placeholder,val='')=>`<option value="">${placeholder}</option>`+arr.map(x=>`<option value="${esc(x.id)}" ${String(val||'')===String(x.id)?'selected':''}>${esc(x.name||x.full_name||x.email)}</option>`).join('');
    const dt=item?.scheduled_at?new Date(item.scheduled_at).toISOString().slice(0,16):'';
    document.querySelector('#modalBox').innerHTML=`<h2>${id?'Edit':'Add'} Content</h2><div class="form">
      <label>Client *<select id="content_client">${options(clients,'Select client',item?.client_id||'')}</select></label>
      <label>Content title *<input id="content_title" type="text" value="${esc(item?.title||'')}" placeholder="e.g. Independence Day Reel"></label>
      <label>Content type<select id="content_type">${['Reel','Carousel','Static Post','Story','Video','Article'].map(x=>`<option value="${x}" ${item?.content_type===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Platform<select id="content_platform">${['Instagram','Facebook','LinkedIn','YouTube'].map(x=>`<option value="${x}" ${item?.platform===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Caption<textarea id="content_caption" placeholder="Caption / creative notes">${esc(item?.caption||'')}</textarea></label>
      <label>Schedule<input id="content_schedule" type="datetime-local" value="${esc(dt)}"></label>
      <label>Assigned to<select id="content_owner">${options(profiles,'Select team member',item?.owner_id||auth?.user?.id||'')}</select></label>
      <label>Status<select id="content_status">${['draft','review','approved','scheduled','published'].map(x=>`<option value="${x}" ${item?.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Client approved<select id="content_approved"><option value="false" ${!item?.client_approved?'selected':''}>No</option><option value="true" ${item?.client_approved?'selected':''}>Yes</option></select></label>
    </div><div class="modal-actions">${id?`<button type="button" class="danger" onclick="deleteContent('${id}')">Delete</button>`:'<span></span>'}<button type="button" class="secondary" onclick="closeModal()">Cancel</button><button type="button" class="primary" onclick="saveContent(${id?`'${id}'`:'null'})">Save Content</button></div>`;
    document.querySelector('#modal').classList.add('show');
  };

  window.saveContent=async function(id){
    const {data:{user}}=await contentDB.auth.getUser();
    const title=document.querySelector('#content_title')?.value.trim();
    const client=document.querySelector('#content_client')?.value||null;
    if(!client)return toast('Please select a client');
    if(!title)return toast('Please enter a content title');
    const schedule=document.querySelector('#content_schedule')?.value;
    const payload={client_id:client,title,content_type:document.querySelector('#content_type')?.value||null,platform:document.querySelector('#content_platform')?.value||null,caption:document.querySelector('#content_caption')?.value.trim()||null,scheduled_at:schedule?new Date(schedule).toISOString():null,owner_id:document.querySelector('#content_owner')?.value||user?.id||null,status:document.querySelector('#content_status')?.value||'draft',client_approved:document.querySelector('#content_approved')?.value==='true'};
    const r=id?await contentDB.from('content_items').update(payload).eq('id',id):await contentDB.from('content_items').insert(payload);
    if(r.error)return toast('Content error: '+r.error.message);
    document.querySelector('#modal').classList.remove('show');toast(id?'Content updated successfully':'Content created successfully');setTimeout(()=>location.reload(),400);
  };

  window.deleteContent=async function(id){
    if(!confirm('Delete this content item?'))return;
    const r=await contentDB.from('content_items').delete().eq('id',id);
    if(r.error)return toast('Delete error: '+r.error.message);
    document.querySelector('#modal').classList.remove('show');location.reload();
  };
})();
