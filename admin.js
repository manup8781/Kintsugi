const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const config=window.KINTSUGI_CONFIG||{};
const configured=Boolean(config.supabaseUrl&&config.supabaseAnonKey&&!config.supabaseUrl.includes('__')&&window.supabase?.createClient);
const db=configured?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
const state={products:[],tattoos:[]};
const safe=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const initialPortfolio=[
  {seed_key:'higanbana',asset:'assets/tattoo-red-spider-lily.png',title:'Higanbana',zone:'Red Ink',style:'Botánico',alt_text:'Tatuaje rojo de flores higanbana',layout:'work-wide',display_order:1},
  {seed_key:'luna-botanica',asset:'assets/tattoo-moon-floral.png',title:'Luna Botánica',zone:'Fine Line',style:'Floral',alt_text:'Tatuaje de flores y luna',layout:'standard',display_order:2},
  {seed_key:'arana-en-flor',asset:'assets/tattoo-spider-floral.png',title:'Araña en flor',zone:'Blackwork',style:'Orgánico',alt_text:'Tatuaje de araña y flores',layout:'standard',display_order:3},
  {seed_key:'corazon-oni',asset:'assets/tattoo-oni-heart.png',title:'Corazón Oni',zone:'Red & Black',style:'Neo japonés',alt_text:'Tatuaje rojo y negro de corazón y máscaras oni',layout:'work-wide',display_order:4},
  {seed_key:'nocturna',asset:'assets/tattoo-bats.png',title:'Nocturna',zone:'Micro',style:'Blackwork',alt_text:'Tatuaje de murciélagos',layout:'standard',display_order:5},
  {seed_key:'little-baphy',asset:'assets/tattoo-goat.png',title:'Little Baphy',zone:'Illustrative',style:'Fine Line',alt_text:'Tatuaje ilustrativo de cabra',layout:'standard',display_order:6},
  {seed_key:'molecular-snow',asset:'assets/tattoo-red-snowflake.png',title:'Molecular Snow',zone:'Red Ink',style:'Geométrico',alt_text:'Tatuaje geométrico rojo',layout:'standard',display_order:7},
  {seed_key:'gargola',asset:'assets/tattoo-demon.png',title:'Gárgola',zone:'Dark',style:'Black & Grey',alt_text:'Tatuaje blackwork de criatura alada',layout:'work-tall',display_order:8},
  {seed_key:'tribal-flow',asset:'assets/tattoo-tribal.png',title:'Tribal Flow',zone:'Blackwork',style:'Tribal',alt_text:'Tatuaje tribal abstracto',layout:'standard',display_order:9}
];

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function storageUrl(bucket,path){return path?db.storage.from(bucket).getPublicUrl(path).data.publicUrl:''}
function fileExtension(file){const fromName=file.name.split('.').pop()?.toLowerCase();return ['jpg','jpeg','png','webp'].includes(fromName)?fromName:(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg')}
async function uploadImage(bucket,file,prefix='uploads'){
  if(!file||!file.size)throw new Error('Selecciona una imagen.');
  if(!file.type.startsWith('image/'))throw new Error('El archivo debe ser una imagen.');
  if(file.size>8*1024*1024)throw new Error('La imagen no puede superar 8 MB.');
  const path=`${prefix}/${crypto.randomUUID()}.${fileExtension(file)}`;
  const {error}=await db.storage.from(bucket).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(error)throw error;
  return path;
}
async function deleteImage(bucket,path){if(path)await db.storage.from(bucket).remove([path])}

$$('.admin-nav').forEach(btn=>btn.onclick=()=>{$$('.admin-nav').forEach(b=>b.classList.remove('active'));$$('.admin-panel').forEach(p=>p.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.panel).classList.add('active')});
$$('.file-field input').forEach(input=>input.onchange=()=>{const field=input.closest('.file-field');field.querySelector('span').textContent=input.files[0]?.name||'Elegir imagen';field.querySelector('small').textContent=input.files[0]?'Imagen lista para subir':'Obligatoria al crear; opcional al editar'});

async function ensureAdmin(){
  const {data:{session}}=await db.auth.getSession();
  if(!session)return false;
  const {data,error}=await db.rpc('is_admin');
  if(error||!data){await db.auth.signOut({scope:'local'});$('#loginError').textContent='Esta cuenta no está autorizada como administradora.';return false}
  return true;
}
async function showAdmin(){
  $('#lockScreen').hidden=true;$('#adminShell').hidden=false;
  await loadAll();
}
async function initialize(){
  if(!db){$('#loginError').textContent='Falta configurar Supabase en Netlify. Revisa la guía incluida.';$('#loginForm button').disabled=true;return}
  if(await ensureAdmin())await showAdmin();
}
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();$('#loginError').textContent='';
  const button=e.target.querySelector('button');button.disabled=true;button.querySelector('span').textContent='Comprobando…';
  const {error}=await db.auth.signInWithPassword({email:$('#emailInput').value.trim(),password:$('#passwordInput').value});
  if(error){$('#loginError').textContent='No pudimos iniciar sesión. Revisa el correo y la contraseña.'}
  else if(await ensureAdmin())await showAdmin();
  button.disabled=false;button.querySelector('span').textContent='Entrar';
};
$('#logoutButton').onclick=async()=>{await db.auth.signOut({scope:'local'});location.reload()};

async function loadAll(){
  const [products,tattoos]=await Promise.all([
    db.from('products').select('*').order('display_order',{ascending:true}).order('created_at',{ascending:false}),
    db.from('portfolio_items').select('*').order('display_order',{ascending:true}).order('created_at',{ascending:false})
  ]);
  if(products.error||tattoos.error){toast('No pudimos cargar el contenido');console.error(products.error||tattoos.error);return}
  state.products=products.data||[];state.tattoos=tattoos.data||[];renderAll();
}
function renderAll(){
  $('#productStat').textContent=state.products.filter(item=>item.is_published).length;
  $('#tattooStat').textContent=state.tattoos.filter(item=>item.is_published).length;
  renderList('products');renderList('tattoos');
  const imported=new Set(state.tattoos.map(item=>item.seed_key).filter(Boolean));
  const missing=initialPortfolio.filter(item=>!imported.has(item.seed_key)).length;
  $('#importPortfolioButton').disabled=missing===0;
  $('#importPortfolioButton').firstChild.textContent=missing?`Importar ${missing} tatuaje${missing===1?'':'s'} `:'Portfolio importado ';
  if(!missing)$('#importStatus').textContent='Las fotografías iniciales ya están administradas desde Supabase.';
}
function renderList(type){
  const isProduct=type==='products',items=isProduct?state.products:state.tattoos,root=$(isProduct?'#productList':'#tattooList'),bucket=isProduct?'products':'portfolio';
  root.innerHTML=items.length?items.map(item=>`<article class="admin-item"><img src="${safe(storageUrl(bucket,item.image_path))}" alt=""><div><strong>${safe(isProduct?item.name:item.title)}</strong><small>${safe(isProduct?`${item.material} · $${item.price}`:`${item.zone} · ${item.style}`)} · ${item.is_published?'Visible':'Oculto'}</small><div class="item-actions"><button data-edit="${item.id}" aria-label="Editar">Editar</button><button data-delete="${item.id}" aria-label="Eliminar">Eliminar</button></div></div></article>`).join(''):'<p class="empty-list">Todavía no agregaste publicaciones.</p>';
  root.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>startEdit(type,btn.dataset.edit));
  root.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>removeItem(type,btn.dataset.delete));
}
function startEdit(type,id){
  const isProduct=type==='products',item=(isProduct?state.products:state.tattoos).find(entry=>entry.id===id),form=$(isProduct?'#productForm':'#tattooForm');
  if(!item)return;
  [...form.elements].forEach(input=>{if(!input.name||input.type==='file')return;if(input.type==='checkbox')input.checked=Boolean(item[input.name]);else input.value=item[input.name]??''});
  $(isProduct?'#productFormTitle':'#tattooFormTitle').textContent=isProduct?'Editar joya':'Editar tatuaje';
  $(isProduct?'#productSubmitText':'#tattooSubmitText').textContent='Guardar cambios';
  $(isProduct?'#cancelProductEdit':'#cancelTattooEdit').hidden=false;
  form.scrollIntoView({behavior:'smooth',block:'start'});
}
function resetForm(type){
  const isProduct=type==='products',form=$(isProduct?'#productForm':'#tattooForm');form.reset();form.elements.display_order.value='0';form.elements.is_published.checked=true;
  $(isProduct?'#productFormTitle':'#tattooFormTitle').textContent=isProduct?'Nueva joya':'Nuevo tatuaje';
  $(isProduct?'#productSubmitText':'#tattooSubmitText').textContent=isProduct?'Publicar joya':'Publicar tatuaje';
  $(isProduct?'#cancelProductEdit':'#cancelTattooEdit').hidden=true;
  const field=form.querySelector('.file-field');field.querySelector('span').textContent='Elegir imagen';field.querySelector('small').textContent='Obligatoria al crear; opcional al editar';
}
$('#cancelProductEdit').onclick=()=>resetForm('products');$('#cancelTattooEdit').onclick=()=>resetForm('tattoos');

async function saveForm(type,form){
  const isProduct=type==='products',bucket=isProduct?'products':'portfolio',data=new FormData(form),id=String(data.get('id')||''),oldPath=String(data.get('current_image_path')||''),file=data.get('image');
  let newPath='';
  try{
    if(file?.size)newPath=await uploadImage(bucket,file);
    if(!id&&!newPath)throw new Error('Selecciona una imagen.');
    const payload=isProduct?{
      name:String(data.get('name')).trim(),price:Number(data.get('price')),category:String(data.get('category')),material:String(data.get('material')).trim(),display_order:Number(data.get('display_order'))||0,is_published:data.get('is_published')==='on',image_path:newPath||oldPath
    }:{
      title:String(data.get('title')).trim(),zone:String(data.get('zone')).trim(),style:String(data.get('style')).trim(),alt_text:String(data.get('alt_text')).trim(),layout:String(data.get('layout')),display_order:Number(data.get('display_order'))||0,is_published:data.get('is_published')==='on',image_path:newPath||oldPath
    };
    const result=id?await db.from(type==='products'?'products':'portfolio_items').update(payload).eq('id',id):await db.from(type==='products'?'products':'portfolio_items').insert(payload);
    if(result.error)throw result.error;
    if(newPath&&oldPath&&newPath!==oldPath)await deleteImage(bucket,oldPath);
    resetForm(type);await loadAll();toast(id?'Cambios guardados':'Publicación creada');
  }catch(error){if(newPath)await deleteImage(bucket,newPath);console.error(error);toast(error.message||'No pudimos guardar la publicación')}
}
$('#productForm').onsubmit=async e=>{e.preventDefault();await saveForm('products',e.target)};
$('#tattooForm').onsubmit=async e=>{e.preventDefault();await saveForm('tattoos',e.target)};
async function removeItem(type,id){
  if(!confirm('¿Eliminar esta publicación y su imagen?'))return;
  const isProduct=type==='products',items=isProduct?state.products:state.tattoos,item=items.find(entry=>entry.id===id),table=isProduct?'products':'portfolio_items',bucket=isProduct?'products':'portfolio';
  const {error}=await db.from(table).delete().eq('id',id);
  if(error){console.error(error);toast('No pudimos eliminar la publicación');return}
  await deleteImage(bucket,item?.image_path);await loadAll();toast('Publicación eliminada');
}

$('#importPortfolioButton').onclick=async()=>{
  const button=$('#importPortfolioButton'),status=$('#importStatus'),existing=new Set(state.tattoos.map(item=>item.seed_key).filter(Boolean)),pending=initialPortfolio.filter(item=>!existing.has(item.seed_key));
  button.disabled=true;
  try{
    for(let index=0;index<pending.length;index++){
      const item=pending[index];status.textContent=`Subiendo ${index+1} de ${pending.length}: ${item.title}…`;
      const response=await fetch(item.asset);if(!response.ok)throw new Error(`No se encontró ${item.asset}`);const blob=await response.blob();
      const extension=item.asset.split('.').pop();const path=`initial/${item.seed_key}.${extension}`;
      const uploaded=await db.storage.from('portfolio').upload(path,blob,{contentType:blob.type,cacheControl:'3600',upsert:true});if(uploaded.error)throw uploaded.error;
      const {asset,...payload}=item;const saved=await db.from('portfolio_items').upsert({...payload,image_path:path,is_published:true},{onConflict:'seed_key'});if(saved.error)throw saved.error;
    }
    status.textContent='Importación completa. Ya puedes editar o reemplazar cualquiera de las fotos.';await loadAll();toast('Portfolio importado a Supabase');
  }catch(error){console.error(error);status.textContent='La importación se detuvo. Puedes volver a intentarlo sin duplicar lo ya subido.';toast(error.message||'No pudimos completar la importación');button.disabled=false}
};

initialize();
