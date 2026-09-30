function config() { return {url:(process.env.SUPABASE_URL||'').replace(/\/$/,''),key:process.env.SUPABASE_SERVICE_ROLE_KEY||'',table:process.env.SUPABASE_BOOKINGS_TABLE||'bookings'}; }
function headers(key){return {apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};}
async function sendEmail(to,subject,text){const key=process.env.RESEND_API_KEY;if(!key||!to)return false;const from=process.env.CONTACT_FROM||process.env.RESEND_FROM||'Crown & Blade <onboarding@resend.dev>';try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,text})});return r.ok;}catch{return false}}
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  if(process.env.CRON_SECRET&&req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return res.status(401).json({ok:false,error:'Unauthorized'});
  const {url,key,table}=config();if(!url||!key)return res.status(503).json({ok:false,error:'Database is not configured'});
  const now=new Date();const h24=new Date(now.getTime()+24*60*60*1000);const h2=new Date(now.getTime()+2*60*60*1000);
  const from=new Date(now.getTime()-15*60*1000).toISOString();const to=new Date(now.getTime()+24*60*60*1000+15*60*1000).toISOString();
  const params=new URLSearchParams({select:'*',created_at:`lt.${to}`,date:`gte.${now.toISOString().slice(0,10)}`});
  let r;try{r=await fetch(`${url}/rest/v1/${table}?${params}`,{headers:headers(key)});}catch{return res.status(502).json({ok:false,error:'Database connection failed'});}const rows=await r.json().catch(()=>[]);if(!r.ok)return res.status(502).json({ok:false,error:'Database read failed'});
  let sent=0;
  for(const b of Array.isArray(rows)?rows:[]){if(!b.customer_email)continue;const at=new Date(`${b.date}T${b.time}:00`);if(Number.isNaN(at.getTime()))continue;
    const diff=at-now;let kind='';if(diff>23.75*60*60*1000&&diff<24.25*60*60*1000&&!b.reminder_24_sent)kind='24';else if(diff>1.75*60*60*1000&&diff<2.25*60*60*1000&&!b.reminder_2_sent)kind='2';if(!kind)continue;
    const ok=await sendEmail(b.customer_email,`Crown & Blade — ${kind==='24'?'нагадування за 24 години':'нагадування за 2 години'}`,`Нагадування про ваш запис.\n\nПослуга: ${b.service||b.service_key}\nБарбер: ${b.barber}\nДата: ${b.date}\nЧас: ${b.time}`);if(!ok)continue;sent++;
    const field=kind==='24'?'reminder_24_sent':'reminder_2_sent';await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',headers:{...headers(key),Prefer:'return=minimal'},body:JSON.stringify({[field]:true})}).catch(()=>{});
  }
  return res.status(200).json({ok:true,sent});
}
