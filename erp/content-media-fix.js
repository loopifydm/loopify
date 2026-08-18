// Content Calendar media upload module
(function(){
  const SUPABASE_URL='https://unexjewenkbegaefnpsz.supabase.co';
  const SUPABASE_KEY='sb_publishable_8aU4JE6TjH-x1TTH2qPbTA_aZ7Fjz_p';
  const mediaDB=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const toast=m=>window.toast?window.toast(m):alert(m);
  const IMAGE_MAX_SOURCE=50*1024*1024;
  const VIDEO_MAX_SOURCE=50*1024*1024;
  const IMAGE_TARGET=2.5*1024*1024;

  function opts(arr,placeholder,val=''){return `<option value="">${placeholder}</option>`+arr.map(x=>`<option value="${esc(x.id)}" ${String(val||'')===String(x.id)?'selected':''}>${esc(x.name||x.full_name||x.email)}</option>`).join('')}

  async function compressImage(file){
    if(!file.type.startsWith('image/') || file.type==='image/gif') return file;
    if(file.size<=IMAGE_TARGET && file.type==='image/webp') return file;
    const bitmap=await createImageBitmap(file);
    const maxSide=1800;
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{alpha:true});
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close();
    let quality=.82;
    let blob=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));
    if(!blob) throw new Error('Could not compress image.');
    while(blob.size>IMAGE_TARGET && quality>.55){
      quality-=.06;
      blob=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));
    }
    if(blob.size>=file.size) return file;
    return new File([blob],(file.name.replace(/\.[^.]+$/,'')||'content')+'.webp',{type:'image/webp',lastModified:Date.now()});
  }

  function formatMB(bytes){return (bytes/1024/1024).toFixed(1)+' MB'}

  window.openContentWithMedia=async function(id=null){
    const [{data:{user},error:ue},{data:clients,error:ce},{data:profiles,error:pe}]=await Promise.all([mediaDB.auth.getUser(),mediaDB.from('clients').select('id,name').order('name'),mediaDB.from('profiles').select('id,full_name,email').order('full_name')]);
    if(ue||ce||pe)return toast((ue||ce||pe).message);
    let item=null;
    if(id){const r=await mediaDB.from('content_items').select('*').eq('id',id).single();if(r.error)return toast(r.error.message);item=r.data;}
    const mediaPreview=item?.media_url?(item.media_type?.startsWith('video/')?`<video src="${esc(item.media_url)}" controls class="media-preview"></video>`:`<img src="${esc(item.media_url)}" class="media-preview" alt="Content preview">`):`<div class="media-empty">No media uploaded</div>`;
    document.querySelector('#modalBox').innerHTML=`<h2>${id?'Edit':'Add'} Content</h2><div class="form">
      <label>Client *<select id="cm_client">${opts(clients,'Select client',item?.client_id||'')}</select></label>
      <label>Content title *<input id="cm_title" type="text" value="${esc(item?.title||'')}" placeholder="Content title"></label>
      <label>Content type<select id="cm_type">${['Reel','Carousel','Static Post','Story','Video','Article'].map(x=>`<option ${item?.content_type===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Platform<select id="cm_platform">${['Instagram','Facebook','LinkedIn','YouTube'].map(x=>`<option ${item?.platform===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Caption<textarea id="cm_caption" placeholder="Caption">${esc(item?.caption||'')}</textarea></label>
      <label>Schedule<input id="cm_schedule" type="datetime-local" value="${item?.scheduled_at?new Date(item.scheduled_at).toISOString().slice(0,16):''}"></label>
      <label>Owner<select id="cm_owner">${opts(profiles,'Select team member',item?.owner_id||user?.id||'')}</select></label>
      <label>Status<select id="cm_status">${['draft','review','approved','scheduled','published'].map(x=>`<option ${item?.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Content Image / Video<input id="cm_media" type="file" accept="image/*,video/*"><small>Images are automatically resized and compressed to about 2.5 MB. Videos are limited to 50 MB.</small></label>
      <div id="cm_media_info" class="tag"></div><div id="cm_media_preview">${mediaPreview}</div>
      <label class="check-row"><input id="cm_approved" type="checkbox" ${item?.client_approved?'checked':''}> Client approved</label>
    </div><div class="modal-actions">${id?`<button type="button" class="danger" onclick="deleteContentWithMedia('${id}')">Delete</button>`:'<span></span>'}<button type="button" class="secondary" onclick="closeModal()">Cancel</button><button type="button" class="primary" id="cm_save" onclick="saveContentWithMedia(${id?`'${id}'`:'null'})">Save Content</button></div>`;
    document.querySelector('#modal').classList.add('show');
    document.querySelector('#cm_media').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>(f.type.startsWith('video/')?VIDEO_MAX_SOURCE:IMAGE_MAX_SOURCE))return toast(`File is too large. Maximum ${f.type.startsWith('video/')?'50 MB':'50 MB'}.`);const url=URL.createObjectURL(f);document.querySelector('#cm_media_info').textContent=`Selected: ${f.name} • ${formatMB(f.size)}${f.type.startsWith('image/')?' • will be compressed automatically':''}`;document.querySelector('#cm_media_preview').innerHTML=f.type.startsWith('video/')?`<video src="${url}" controls class="media-preview"></video>`:`<img src="${url}" class="media-preview" alt="Selected media">`});
  };

  window.saveContentWithMedia=async function(id){
    const save=document.querySelector('#cm_save'),title=document.querySelector('#cm_title')?.value.trim(),client=document.querySelector('#cm_client')?.value;
    if(!title)return toast('Please enter a content title');if(!client)return toast('Please select a client');save.disabled=true;save.textContent='Preparing media...';
    try{
      const {data:{user}}=await mediaDB.auth.getUser();let media_url=null,media_type=null;
      const existing=id?(await mediaDB.from('content_items').select('media_url,media_type').eq('id',id).single()).data:null;
      const selected=document.querySelector('#cm_media')?.files?.[0];
      if(selected){
        const isVideo=selected.type.startsWith('video/');
        const max=isVideo?VIDEO_MAX_SOURCE:IMAGE_MAX_SOURCE;
        if(selected.size>max)throw new Error(`File is larger than ${formatMB(max)}.`);
        let file=selected;
        if(!isVideo){save.textContent='Compressing image...';file=await compressImage(selected);}
        const ext=(file.name.split('.').pop()||'bin').toLowerCase();
        const path=`${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        save.textContent=`Uploading ${formatMB(file.size)}...`;
        const up=await mediaDB.storage.from('content-media').upload(path,file,{upsert:false,contentType:file.type||undefined,cacheControl:'3600'});if(up.error)throw up.error;
        media_url=mediaDB.storage.from('content-media').getPublicUrl(path).data.publicUrl;media_type=file.type||'';
        if(existing?.media_url?.includes('/storage/v1/object/public/content-media/')){const oldPath=existing.media_url.split('/storage/v1/object/public/content-media/')[1];if(oldPath)await mediaDB.storage.from('content-media').remove([decodeURIComponent(oldPath)])}
      }else if(existing){media_url=existing.media_url||null;media_type=existing.media_type||null}
      const payload={client_id:client,title,content_type:document.querySelector('#cm_type')?.value||null,platform:document.querySelector('#cm_platform')?.value||null,caption:document.querySelector('#cm_caption')?.value.trim()||null,scheduled_at:document.querySelector('#cm_schedule')?.value?new Date(document.querySelector('#cm_schedule').value).toISOString():null,owner_id:document.querySelector('#cm_owner')?.value||user.id,status:document.querySelector('#cm_status')?.value||'draft',client_approved:document.querySelector('#cm_approved')?.checked||false,media_url,media_type};
      const r=id?await mediaDB.from('content_items').update(payload).eq('id',id):await mediaDB.from('content_items').insert(payload);if(r.error)throw r.error;
      document.querySelector('#modal').classList.remove('show');toast(id?'Content updated successfully':'Content created successfully');setTimeout(()=>location.reload(),350);
    }catch(e){toast('Content error: '+e.message);save.disabled=false;save.textContent='Save Content'}
  };

  window.deleteContentWithMedia=async function(id){if(!confirm('Delete this content and its uploaded media?'))return;const r=await mediaDB.from('content_items').select('media_url').eq('id',id).single();if(r.data?.media_url?.includes('/storage/v1/object/public/content-media/')){const oldPath=r.data.media_url.split('/storage/v1/object/public/content-media/')[1];if(oldPath)await mediaDB.storage.from('content-media').remove([decodeURIComponent(oldPath)])}const d=await mediaDB.from('content_items').delete().eq('id',id);if(d.error)return toast(d.error.message);document.querySelector('#modal').classList.remove('show');location.reload()};

  const originalOpen=window.openEntity;
  window.openEntity=function(type,id=null){if(type==='content')return window.openContentWithMedia(id);return originalOpen(type,id)};
  window.contentTable=function(items){
    return `<div class="table-wrap"><table><thead><tr><th>Media</th><th>Schedule</th><th>Client</th><th>Content</th><th>Platform</th><th>Owner</th><th>Status</th><th></th></tr></thead><tbody>${items.map(x=>{const media=x.media_url?(x.media_type?.startsWith('video/')?`<video src="${esc(x.media_url)}" class="table-media" muted></video>`:`<img src="${esc(x.media_url)}" class="table-media" alt="Content">`):`<span class="no-media">No media</span>`;const owner=(window.state?.profiles||[]).find(p=>p.id===x.owner_id);const client=(window.state?.clients||[]).find(c=>c.id===x.client_id);return `<tr><td>${media}</td><td>${esc(x.scheduled_at?new Date(x.scheduled_at).toLocaleString('en-IN'):'Not scheduled')}</td><td>${esc(client?.name||'Unassigned')}</td><td><b>${esc(x.title)}</b><div class="tag">${esc(x.content_type||'')}</div></td><td>${esc(x.platform||'-')}</td><td>${esc(owner?.full_name||owner?.email||'Unassigned')}</td><td><span class="badge ${['approved','scheduled','published'].includes(x.status)?'active':'review'}">${esc(x.status||'-')}</span></td><td><button type="button" class="icon-btn" onclick="editEntity('content','${x.id}')">Edit</button></td></tr>`}).join('')}</tbody></table></div>`;
  };
  window.editEntity=function(type,id){if(type==='content')return window.openContentWithMedia(id);return window.openEntity(type,id)};
})();
