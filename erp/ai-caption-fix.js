(function(){
 const originalOpenEntity=window.openEntity;
 const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
 window.openEntity=async function(type,id=null){
  if(type!=='content') return originalOpenEntity(type,id);
  await originalOpenEntity(type,id);
  const box=document.querySelector('#modalBox'); if(!box||document.querySelector('#aiCaptionBtn'))return;
  const label=document.createElement('div'); label.style.cssText='margin-top:8px'; label.innerHTML='<button type="button" id="aiCaptionBtn" class="secondary" style="width:100%">✨ AI Caption Creator</button><input id="aiMediaFile" type="file" accept="image/*,video/*,.pdf" style="display:none"><div id="aiCaptionStatus" class="tag" style="margin-top:6px"></div>';
  const cap=document.querySelector('#content_caption'); cap?.parentElement?.insertAdjacentElement('afterend',label);
  document.querySelector('#aiCaptionBtn').onclick=()=>document.querySelector('#aiMediaFile').click();
  document.querySelector('#aiMediaFile').onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;
   const status=document.querySelector('#aiCaptionStatus');status.textContent='Analyzing media and creating caption…';
   try{
    const clientId=document.querySelector('#content_client')?.value;let client={};
    if(clientId){const {data}=await db.from('clients').select('name,industry,package,email').eq('id',clientId).maybeSingle();client=data||{};}
    const platform=document.querySelector('#content_platform')?.value||'Instagram';
    const title=document.querySelector('#content_title')?.value||'';
    const desc=`Uploaded file: ${file.name}; type: ${file.type||'unknown'}; size: ${Math.round(file.size/1024)} KB. Content title: ${title}. The file itself is attached to the content workflow; use the title, file type and client context and do not invent visual facts you cannot verify.`;
    const {data,error}=await db.functions.invoke('ai-caption-writer',{body:{client_name:client.name,industry:client.industry,services:client.package,target_audience:'The client\'s target audience',tone:'Professional, engaging and conversion-focused',platform,media_description:desc}});
    if(error)throw new Error(error.message||'AI request failed');if(data?.error)throw new Error(data.error);
    const r=data.result||{};if(cap)cap.value=r.primary||'';status.innerHTML='<b>AI caption created.</b> You can edit it before saving.';
    let extra=document.querySelector('#aiCaptionAlternatives');if(!extra){extra=document.createElement('div');extra.id='aiCaptionAlternatives';extra.style.cssText='margin-top:8px';label.appendChild(extra)}extra.innerHTML=`<div class="tag"><b>Short:</b> ${esc(r.short||'-')}<br><b>CTA:</b> ${esc(r.cta||'-')}<br><b>Hashtags:</b> ${esc(Array.isArray(r.hashtags)?r.hashtags.join(' '):r.hashtags||'-')}</div>`;
   }catch(err){status.textContent='AI caption error: '+(err.message||err);}
  };
 };
})();
