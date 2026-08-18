// Task module fix: reliable task modal, save/update/delete, and completed status.
(function(){
  const originalOpenEntity=window.openEntity;
  window.openEntity=function(type,id=null){
    if(type!=='tasks') return originalOpenEntity(type,id);
    const item=id ? (window.state?.tasks||[]).find(x=>x.id===id) : null;
    const clients=window.state?.clients||[], profiles=window.state?.profiles||[];
    const esc=window.esc || (s=>String(s??''));
    const opts=(arr,placeholder,val='')=>`<option value="">${placeholder}</option>`+arr.map(x=>`<option value="${esc(x.id)}" ${String(val)===String(x.id)?'selected':''}>${esc(x.name||x.full_name||x.email)}</option>`).join('');
    const field=(id,label,html,required=false)=>`<label>${label}${required?' *':''}${html}</label>`;
    document.querySelector('#modalBox').innerHTML=`<h2>${id?'Edit':'Add'} Task</h2><div class="form">
      ${field('title','Task title',`<input id="task_title" type="text" value="${esc(item?.title||'')}" placeholder="Task title">`,true)}
      ${field('client','Client',`<select id="task_client">${opts(clients,'Select client',item?.client_id||'')}</select>`)}
      ${field('description','Description',`<textarea id="task_description" placeholder="Task description">${esc(item?.description||'')}</textarea>`)}
      ${field('owner','Assigned to',`<select id="task_owner">${opts(profiles,'Select team member',item?.owner_id||window.state?.user?.id||'')}</select>`)}
      ${field('due','Due date',`<input id="task_due" type="date" value="${esc(item?.due_date||'')}">`)}
      ${field('priority','Priority',`<select id="task_priority">${['low','medium','high','urgent'].map(x=>`<option ${item?.priority===x?'selected':''}>${x}</option>`).join('')}</select>`)}
      ${field('status','Status',`<select id="task_status">${['pending','in_progress','review','approved','completed'].map(x=>`<option ${item?.status===x?'selected':''}>${x}</option>`).join('')}</select>`)}
    </div><div class="modal-actions">${id?`<button type="button" class="danger" onclick="deleteTask('${id}')">Delete</button>`:'<span></span>'}<button type="button" class="secondary" onclick="closeModal()">Cancel</button><button type="button" class="primary" onclick="saveTask(${id?`'${id}'`:'null'})">Save Task</button></div>`;
    document.querySelector('#modal').classList.add('show');
  };

  window.saveTask=async function(id){
    const title=document.querySelector('#task_title')?.value.trim();
    if(!title){ if(window.toast) window.toast('Please enter a task title'); return; }
    const payload={
      title,
      client_id:document.querySelector('#task_client')?.value||null,
      description:document.querySelector('#task_description')?.value.trim()||null,
      owner_id:document.querySelector('#task_owner')?.value||window.state?.user?.id||null,
      due_date:document.querySelector('#task_due')?.value||null,
      priority:document.querySelector('#task_priority')?.value||'medium',
      status:document.querySelector('#task_status')?.value||'pending'
    };
    let r=id?await window.db.from('tasks').update(payload).eq('id',id):await window.db.from('tasks').insert(payload);
    if(r.error){ if(window.toast) window.toast('Task error: '+r.error.message); return; }
    window.closeModal(); await window.refresh(); window.render(); if(window.toast) window.toast(id?'Task updated':'Task created successfully');
  };

  window.deleteTask=async function(id){
    if(!confirm('Delete this task?')) return;
    const r=await window.db.from('tasks').delete().eq('id',id);
    if(r.error){ if(window.toast) window.toast('Delete error: '+r.error.message); return; }
    window.closeModal(); await window.refresh(); window.render(); if(window.toast) window.toast('Task deleted');
  };

  window.tasks=function(){
    return window.head('Task Management','Assign work, deadlines, priorities and delivery status.','openEntity("tasks")')+`<div class="panel"><div class="toolbar"><select id="taskFilter" onchange="filterSimple('tasks')"><option value="">All status</option><option>pending</option><option>in_progress</option><option>review</option><option>approved</option><option>completed</option></select></div><div id="tasksTable">${window.taskTable(window.state.tasks)}</div></div>`;
  };
})();
