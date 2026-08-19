(function(){
 const originalOpenEntity=window.openEntity;
 const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
 const readBase64=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file)});
 window.openEntity=async function(type,id=null){
  if(type!=='content') return originalOpenEntity(type,id);
  await originalOpenEntity(type,id);
  const box=document.querySelector('#modalBox'); if(!box||document.querySelector('#aiCaptionBtn'))return;
  const media=document.querySelector('#cm_media');
  const anchor=media?.closest('label')||document.querySelector('#cm_media_info')?.parentElement||box;
  const panel=document.createElement('div');
  panel.id='aiCaptionPanel'; panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fafafa';
  panel.innerHTML='<div style="font-weight:700;margin-bottom:6px">✨ AI Caption Creator</div><div style="font-size:12px;opacity:.75;margin-bottom:8px">Upload your creative above, then let AI analyze the actual image and write the caption.</div><button type="button" id="aiCaptionBtn" class="secondary" style="width:100%">✨ Analyze & Create Caption</button><div id="aiCaptionStatus" style="margin-top:7px;font-size:12px"></div><div id="aiCaptionAlternatives" style="margin-top:7px"></div>';
  anchor.insertAdjacentElement('afterend',panel);
  const status=document.querySelector('#aiCaptionStatus'), alt=document.querySelector('#aiCaptionAlternatives'), btn=document.querySelector('#aiCaptionBtn');
  btn.onclick=async()=>{
   const file=document.querySelector('#cm_media')?.files?.[0];
   if(!file){status.textContent='Please choose an image or PDF first.';return;}
   if(file.size>10*1024*1024){status.textContent='For AI analysis, please use a file below 10 MB.';return;}
   if(file.type.startsWith('video/')){status.textContent='Video caption analysis will be added next. Please use the poster/creative image for now.';return;}
   btn.disabled=true;btn.textContent='Analyzing creative…';status.textContent='AI is reading the uploaded creative and writing your caption…';alt.innerHTML='';
   try{
    const clientId=document.querySelector('#cm_client')?.value;let client={};
    if(clientId){const {data}=await db.from('clients').select('name,industry,package').eq('id',clientId).maybeSingle();client=data||{};}
    const base64=await readBase64(file);
    const platform=document.querySelector('#cm_platform')?.value||'Instagram';
    const title=document.querySelector('#cm_title')?.value||'';
    const {data,error}=await db.functions.invoke('ai-caption-writer',{body:{client_name:client.name,industry:client.industry,services:client.package,platform,title,language:'English',file:{name:file.name,mime_type:file.type,base64}}});
    if(error)throw new Error(error.message||'AI request failed');
    if(data?.error)throw new Error(data.error);
    const r=data.result||{};const cap=document.querySelector('#cm_caption');if(cap)cap.value=r.primary||'';
    status.innerHTML='<b>Caption created successfully.</b> Review and edit it before saving.';
    alt.innerHTML=`<div class="tag"><b>Hook:</b> ${esc(r.hook||'-')}<br><b>Short:</b> ${esc(r.short||'-')}<br><b>CTA:</b> ${esc(r.cta||'-')}<br><b>Hashtags:</b> ${esc(Array.isArray(r.hashtags)?r.hashtags.join(' '):r.hashtags||'-')}<br><b>Visual analysis:</b> ${esc(r.visual_summary||'-')}</div>`;
   }catch(err){status.textContent='AI caption error: '+(err.message||err);}
   finally{btn.disabled=false;btn.textContent='✨ Analyze & Create Caption';}
  };
 };
})();
