const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const config=window.KINTSUGI_CONFIG||{};
const configured=Boolean(config.supabaseUrl&&config.supabaseAnonKey&&!config.supabaseUrl.includes('__')&&window.supabase?.createClient);
const db=configured?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
const cart=[];
const overlay=$('#overlay'),drawer=$('#cartDrawer'),modal=$('#bookingModal');
const safe=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const localPortfolio=[
  {title:'Higanbana',zone:'Red Ink',style:'Botánico',alt_text:'Tatuaje rojo de flores higanbana',local_image:'assets/tattoo-red-spider-lily.png',layout:'work-wide'},
  {title:'Luna Botánica',zone:'Fine Line',style:'Floral',alt_text:'Tatuaje de flores y luna',local_image:'assets/tattoo-moon-floral.png',layout:'standard'},
  {title:'Araña en flor',zone:'Blackwork',style:'Orgánico',alt_text:'Tatuaje de araña y flores',local_image:'assets/tattoo-spider-floral.png',layout:'standard'},
  {title:'Corazón Oni',zone:'Red & Black',style:'Neo japonés',alt_text:'Tatuaje rojo y negro de corazón y máscaras oni',local_image:'assets/tattoo-oni-heart.png',layout:'work-wide'},
  {title:'Nocturna',zone:'Micro',style:'Blackwork',alt_text:'Tatuaje de murciélagos',local_image:'assets/tattoo-bats.png',layout:'standard'},
  {title:'Little Baphy',zone:'Illustrative',style:'Fine Line',alt_text:'Tatuaje ilustrativo de cabra',local_image:'assets/tattoo-goat.png',layout:'standard'},
  {title:'Molecular Snow',zone:'Red Ink',style:'Geométrico',alt_text:'Tatuaje geométrico rojo',local_image:'assets/tattoo-red-snowflake.png',layout:'standard'},
  {title:'Gárgola',zone:'Dark',style:'Black & Grey',alt_text:'Tatuaje blackwork de criatura alada',local_image:'assets/tattoo-demon.png',layout:'work-tall'},
  {title:'Tribal Flow',zone:'Blackwork',style:'Tribal',alt_text:'Tatuaje tribal abstracto',local_image:'assets/tattoo-tribal.png',layout:'standard'}
];

function toggleOverlay(show){overlay.classList.toggle('show',show);document.body.style.overflow=show?'hidden':''}
function openCart(){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');toggleOverlay(true)}
function closeAll(){drawer.classList.remove('open');modal.classList.remove('open');$('#lightbox').classList.remove('open');drawer.setAttribute('aria-hidden','true');modal.setAttribute('aria-hidden','true');toggleOverlay(false)}
function renderCart(){
  $('#cartCount').textContent=cart.length;
  $('#cartTotal').textContent='$'+cart.reduce((sum,item)=>sum+item.price,0);
  $('#cartItems').innerHTML=cart.length?cart.map((item,i)=>`<div class="cart-line"><span>${safe(item.name)}</span><strong>$${item.price}</strong><button data-remove="${i}" aria-label="Quitar ${safe(item.name)}">×</button></div>`).join(''):'<p class="empty-cart">Tu bolsa está vacía.<br><span>Encuentra una pieza que te hable.</span></p>';
  $$('[data-remove]').forEach(btn=>btn.onclick=()=>{cart.splice(+btn.dataset.remove,1);renderCart()});
}
function bindProducts(){
  $$('.add-button').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.onclick=()=>{cart.push({name:btn.dataset.product,price:+btn.dataset.price});renderCart();btn.innerHTML='Añadido <span>✓</span>';setTimeout(()=>btn.innerHTML='Añadir <span>＋</span>',1000);openCart()}});
}
function bindLightbox(){
  $$('[data-lightbox]').forEach(card=>{if(card.dataset.bound)return;card.dataset.bound='1';card.onclick=()=>{const box=$('#lightbox');box.querySelector('img').src=card.dataset.lightbox;box.classList.add('open');box.setAttribute('aria-hidden','false');toggleOverlay(true)}});
}
function storageUrl(bucket,path){
  if(!path)return '';
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function observeNew(){$$('.reveal:not(.visible)').forEach(el=>observer.observe(el))}
function renderPortfolio(items){
  const root=$('#portfolioGrid');
  if(!items.length){root.innerHTML='<p class="portfolio-empty">El portfolio se está preparando. Vuelve pronto para ver los nuevos trabajos.</p>';return}
  const cards=items.map((item,index)=>{
    const image=item.local_image||storageUrl('portfolio',item.image_path);
    const layout=['work-wide','work-tall'].includes(item.layout)?item.layout:'';
    const card=`<button class="portfolio-card ${layout} reveal" data-lightbox="${safe(image)}" aria-label="Ver tatuaje ${safe(item.title)}"><img src="${safe(image)}" alt="${safe(item.alt_text||item.title)}" loading="lazy"><span><b>${String(index+1).padStart(2,'0')}</b><span><small>${safe(item.zone)}${item.zone&&item.style?' · ':''}${safe(item.style)}</small><strong>${safe(item.title)}</strong></span><i>↗</i></span></button>`;
    if(index===1)return card+'<div class="portfolio-quote reveal"><span>墨</span><blockquote>“El cuerpo recuerda<br>lo que la tinta nombra.”</blockquote><small>KINTSUGI TATTOO</small></div>';
    return card;
  });
  root.innerHTML=cards.join('');
  bindLightbox();observeNew();
}
function renderRemoteProducts(items){
  const root=$('#productGrid');
  items.forEach(item=>{
    const image=storageUrl('products',item.image_path);
    const card=document.createElement('article');card.className='product-card reveal';card.dataset.category=item.category;
    card.innerHTML=`<div class="product-art"><img class="dynamic-product-image" src="${safe(image)}" alt="${safe(item.name)}" loading="lazy"><span class="product-badge">NUEVO</span></div><div class="product-info"><div><small>${safe(item.material)} · ${safe(item.category)}</small><h3>${safe(item.name)}</h3></div><strong>$${Number(item.price)||0}</strong></div><button class="add-button" data-product="${safe(item.name)}" data-price="${Number(item.price)||0}">Añadir <span>＋</span></button>`;
    root.appendChild(card);
  });
  bindProducts();observeNew();
}
async function loadRemoteContent(){
  if(!db){
    renderPortfolio(localPortfolio);
    return;
  }
  const [portfolioResult,productsResult]=await Promise.all([
    db.from('portfolio_items').select('id,title,zone,style,alt_text,image_path,layout,display_order').eq('is_published',true).order('display_order',{ascending:true}),
    db.from('products').select('id,name,price,category,material,image_path,display_order').eq('is_published',true).order('display_order',{ascending:true})
  ]);
  if(portfolioResult.error){console.error(portfolioResult.error);$('#portfolioGrid').innerHTML='<p class="portfolio-empty">No pudimos cargar el portfolio en este momento.</p>'}
  else renderPortfolio(portfolioResult.data||[]);
  if(productsResult.error)console.error(productsResult.error);else renderRemoteProducts(productsResult.data||[]);
}

$('#cartButton').onclick=openCart;$('[data-close-cart]').onclick=closeAll;overlay.onclick=closeAll;
$$('.filter').forEach(btn=>btn.onclick=()=>{$$('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');$$('.product-card').forEach(card=>card.classList.toggle('hidden',btn.dataset.filter!=='all'&&!card.dataset.category.includes(btn.dataset.filter)))});
function openBooking(){closeAll();modal.classList.add('open');modal.setAttribute('aria-hidden','false');toggleOverlay(true);setTimeout(()=>modal.querySelector('input').focus(),250)}
$$('[data-open-booking]').forEach(btn=>btn.onclick=openBooking);$('[data-close-booking]').onclick=closeAll;
$('#bookingForm').onsubmit=e=>{e.preventDefault();$('#formStatus').textContent='¡Gracias! La consulta está preparada para coordinarse con Kintsugi.';e.target.querySelector('button').textContent='Consulta preparada ✓'};
$('#checkoutButton').onclick=()=>{
  if(!cart.length)return;
  const name=$('#buyerName').value.trim();
  if(!name){$('#buyerName').classList.add('checkout-error');$('#buyerName').focus();return}
  $('#buyerName').classList.remove('checkout-error');
  const list=cart.map((item,i)=>`${i+1}. ${item.name} — $${item.price}`).join('\n');
  const total=cart.reduce((sum,item)=>sum+item.price,0);
  const message=`Hola Kintsugi 👋 Soy ${name}. Quiero consultar por este pedido de joyería:\n\n${list}\n\nTotal referencial: $${total}\n¿Me confirmas disponibilidad y cómo coordinamos la entrega?`;
  window.open(`https://wa.me/59168532799?text=${encodeURIComponent(message)}`,'_blank','noopener');
};
$('#lightbox button').onclick=closeAll;$('#lightbox').onclick=e=>{if(e.target.id==='lightbox')closeAll()};
const menu=$('#mobileMenu'),menuBtn=$('#menuButton');menuBtn.onclick=()=>{const open=menu.classList.toggle('open');menuBtn.classList.toggle('open',open);menuBtn.setAttribute('aria-expanded',open);menu.setAttribute('aria-hidden',!open);document.body.style.overflow=open?'hidden':''};
$$('.mobile-menu a').forEach(a=>a.onclick=()=>{menu.classList.remove('open');menuBtn.classList.remove('open');document.body.style.overflow=''})
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.documentElement.classList.add('animations-ready');
$$('.reveal').forEach(el=>observer.observe(el));
bindProducts();bindLightbox();renderCart();loadRemoteContent();
