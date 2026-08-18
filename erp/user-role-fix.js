// Custom employee job-role support. Database account role remains employee/client for permissions.
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const employeeRoles=['Employee','Content Creator','Video Editor','Graphic Designer','Social Media Manager','Copywriter','Ads Manager','Account Manager','Custom Role'];
  const label=p=>p?.role==='client'?'Client':(p?.job_title||'Employee');

  window.users=function(){
    if(state.profile?.role!=='admin')return '<div class="panel"><h2>Access denied</h2></div>';
    const employees=state.profiles.filter(p=>p.role!=='client'),clients=state.profiles.filter(p=>p.role==='client');
    return '<div class="top"><div><div class="eyebrow">LOOPIFY / ADMIN</div><h1>User Management</h1><div class="subtitle">Create employee and client login accounts.</div></div><div class="user"><button class="primary" onclick="openUserForm()">+ Add User</button></div></div><div class="grid"><div class="panel full"><div class="panel-head"><h2>Employees & Admins</h2></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned Clients</th></tr></thead><tbody>'+employees.map(p=>{const cs=state.clients.filter(c=>c.manager_id===p.id).map(c=>c.name).join(', ')||'-';return '<tr><td><b>'+esc(p.full_name)+'</b></td><td>'+esc(p.email||'-')+'</td><td>'+esc(label(p))+'</td><td>'+esc(cs)+'</td></tr>';}).join('')+'</tbody></table></div></div><div class="panel full"><div class="panel-head"><h2>Client Accounts</h2></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Client</th><th>Role</th></tr></thead><tbody>'+clients.map(p=>{const c=state.clients.find(x=>x.user_id===p.id);return '<tr><td><b>'+esc(p.full_name)+'</b></td><td>'+esc(p.email||'-')+'</td><td>'+esc(c?.name||'Linked client')+'</td><td>Client</td></tr>';}).join('')+'</tbody></table></div></div></div>';
  };

  window.openUserForm=function(){
    const cs=state.clients,available=cs.filter(c=>!c.user_id);
    document.querySelector('#modalBox').innerHTML='<div class="modal-head"><h2>Create Login Account</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form-grid"><label>Full name<input id="u_name" placeholder="Employee / Client name"></label><label>Email<input id="u_email" type="email" placeholder="login@email.com"></label><label>Password<input id="u_password" type="password" placeholder="Minimum 6 characters"></label><label>Account type<select id="u_role" onchange="toggleClientLink()"><option value="employee">Employee</option><option value="client">Client</option></select></label><label id="u_job_wrap">Job role<select id="u_job" onchange="toggleCustomJob()">'+employeeRoles.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select></label><label id="u_custom_wrap">Custom role<input id="u_custom_job" placeholder="e.g. Reel Editor"></label><label id="u_client_wrap">Client<select id="u_client">'+available.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('')+'</select></label><label id="u_assign_wrap">Assign employee to clients<select id="u_assign" multiple size="5">'+cs.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('')+'</select><small>Select one or more clients.</small></label></div><div class="form-actions"><button class="secondary" onclick="closeModal()">Cancel</button><button class="primary" onclick="createPortalUser()">Create account</button></div>';
    document.querySelector('#modal').classList.add('show');toggleClientLink();toggleCustomJob();
  };

  window.toggleClientLink=function(){const r=document.querySelector('#u_role')?.value,w=document.querySelector('#u_client_wrap'),a=document.querySelector('#u_assign_wrap'),j=document.querySelector('#u_job_wrap');if(w)w.style.display=r==='client'?'grid':'none';if(a)a.style.display=r==='employee'?'grid':'none';if(j)j.style.display=r==='employee'?'grid':'none';};
  window.toggleCustomJob=function(){const custom=document.querySelector('#u_job')?.value==='Custom Role',w=document.querySelector('#u_custom_wrap');if(w)w.style.display=custom?'grid':'none';};

  window.createPortalUser=async function(){
    const button=document.querySelector('#modalBox .primary'),accountType=document.querySelector('#u_role')?.value,job=document.querySelector('#u_job')?.value,custom=document.querySelector('#u_custom_job')?.value.trim(),jobTitle=accountType==='client'?'Client':(job==='Custom Role'?custom:job),selected=[...document.querySelector('#u_assign')?.selectedOptions||[]].map(o=>o.value),body={full_name:document.querySelector('#u_name')?.value.trim(),email:document.querySelector('#u_email')?.value.trim(),password:document.querySelector('#u_password')?.value,role:accountType,job_title:jobTitle,client_id:document.querySelector('#u_client')?.value||null};
    if(!body.full_name||!body.email||!body.password)return alert('Please fill name, email and password.');
    if(body.password.length<6)return alert('Password must be at least 6 characters.');
    if(accountType==='employee'&&!jobTitle)return alert('Please enter the employee role.');
    if(accountType==='client'&&!body.client_id)return alert('Please select the client.');
    if(button){button.disabled=true;button.textContent='Creating...';}
    try{const {data,error}=await db.functions.invoke('create-user-v2',{body});if(error)throw new Error(error.message||'Could not create account.');if(data?.error)throw new Error(data.error);if(accountType==='employee'&&selected.length){const {error:e}=await db.from('clients').update({manager_id:data.user_id}).in('id',selected);if(e)throw new Error('User created, but client assignment failed: '+e.message);}closeModal();await refresh();render();alert('Login account created successfully.');}catch(e){alert('Unable to create user: '+(e.message||e));}finally{if(button){button.disabled=false;button.textContent='Create account';}}
  };
})();
