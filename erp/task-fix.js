// Reliable Task Management module for the Loopify ERP.
(function(){
  const SUPABASE_URL='https://unexjewenkbegaefnpsz.supabase.co';
  const SUPABASE_KEY='sb_publishable_8aU4JE6TjH-x1TTH2qPbTA_aZ7Fjz_p';
  const taskDB=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const originalOpenEntity=window.openEntity;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const toast=m=>window.toast?window.toast(m):alert(m);

  window.openEntity=async function(type,id=null){
    if(type!=='tasks') return originalOpenEntity(type,id);
    const [{data:user},{data:clients,error:ce},{data:profiles,error:pe}]=await Promise.all([
      taskDB.auth.getUser(),taskDB.from('clients').select('id,name').order('name'),taskDB.from('profiles').select('id,full_name,email').order('full_name')
    ]);
    if(ce||pe) return toast((ce||pe).message);
    let item=null;
    if(id){const r=await taskDB.from('tasks').select('*').eq('id',id).single();if(r.error)return toast(r.error.message);item=r.data;}
    const options=(arr,placeholder,val='')=>`<option value="">${placeholder}</option>`+arr.map(x=>`<option value="${esc(x.id)}" ${String(val||'')===String(x.id)?'selected':''}>${esc(x.name||x.full_name||x.email)}</option>`).join('');
    const select=(id,label,html)=>`<label>${label}${html}</label>`;
    document.querySelector('#modalBox').innerHTML=`<h2>${id?'Edit':'Add'} Task</h2><div class="form">
      <label>Task title *<input id="task_title" type="text" value="${esc(item?.title||'')}" placeholder="Task title"></label>
      ${select('task_client','Client',`<select id="task_client">${options(clients,'Select client',item?.client_id||'')}</select>`)}
      <label>Description<textarea id="task_description" placeholder="Task description">${esc(item?.description||'')}</textarea></label>
      ${select('task_owner','Assigned to',`<select id="task_owner">${options(profiles,'Select team member',item?.owner_id||user?.user?.id||'')}</select>`)}
      <label>Due date<input id="task_due" type="date" value="${esc(item?.due_date||'')}"></label>
      <label>Priority<select id="task_priority">${['low','medium','high','urgent'].map(x=>`<option value="${x}" ${item?.priority===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Status<select id="task_status">${['pending','in_progress','review','approved','completed'].map(x=>`<option value="${x}" ${item?.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
    </div><div class="modal-actions">${id?`<button type="button" class="danger" onclick="deleteTask('${id}')">Delete</button>`:'<span></span>'}<button type="button" class="secondary" onclick="closeModal()">Cancel</button><button type="button" class="primary" onclick="saveTask(${id?`'${id}'`:'null'})">Save Task</button></div>`;
    document.querySelector('#modal').classList.add('show');
  };

  window.saveTask=async function(id){
    const {data:{user}}=await taskDB.auth.getUser();
    const title=document.querySelector('#task_title')?.value.trim();
    if(!title)return toast('Please enter a task title');
    const payload={title,client_id:document.querySelector('#task_client')?.value||null,description:document.querySelector('#task_description')?.value.trim()||null,owner_id:document.querySelector('#task_owner')?.value||user?.id||null,due_date:document.querySelector('#task_due')?.value||null,priority:document.querySelector('#task_priority')?.value||'medium',status:document.querySelector('#task_status')?.value||'pending'};
    const r=id?await taskDB.from('tasks').update(payload).eq('id',id):await taskDB.from('tasks').insert(payload);
    if(r.error)return toast('Task error: '+r.error.message);
    document.querySelector('#modal').classList.remove('show');toast(id?'Task updated successfully':'Task created successfully');setTimeout(()=>location.reload(),400);
  };

  window.deleteTask=async function(id){
    if(!confirm('Delete this task?'))return;
    const r=await taskDB.from('tasks').delete().eq('id',id);
    if(r.error)return toast('Delete error: '+r.error.message);
    document.querySelector('#modal').classList.remove('show');location.reload();
  };
})();
