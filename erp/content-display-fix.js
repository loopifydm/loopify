// Fix Content Calendar table name resolution.
// app.js declares `state` as a top-level const, not window.state.
(function(){
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  window.contentTable=function(items){
    const clients=state.clients||[];
    const profiles=state.profiles||[];
    return `<div class="table-wrap"><table><thead><tr><th>Media</th><th>Schedule</th><th>Client</th><th>Content</th><th>Platform</th><th>Owner</th><th>Status</th><th></th></tr></thead><tbody>${items.map(x=>{
      const media=x.media_url?(x.media_type?.startsWith('video/')?`<video src="${esc(x.media_url)}" class="table-media" muted></video>`:`<img src="${esc(x.media_url)}" class="table-media" alt="Content">`):`<span class="no-media">No media</span>`;
      const client=clients.find(c=>String(c.id)===String(x.client_id));
      const owner=profiles.find(p=>String(p.id)===String(x.owner_id));
      const approved=x.client_approved===true;
      const status=x.status||'-';
      return `<tr><td>${media}</td><td>${esc(x.scheduled_at?new Date(x.scheduled_at).toLocaleString('en-IN'):'Not scheduled')}</td><td>${esc(client?.name||'Unassigned')}</td><td><b>${esc(x.title)}</b><div class="tag">${esc(x.content_type||'')}</div></td><td>${esc(x.platform||'-')}</td><td>${esc(owner?.full_name||owner?.email||'Unassigned')}</td><td><span class="badge ${['approved','scheduled','published'].includes(status)?'active':'review'}">${esc(status)}</span>${approved?'<div class="tag">Client approved</div>':''}</td><td><button type="button" class="icon-btn" onclick="editEntity('content','${x.id}')">Edit</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  };
})();
