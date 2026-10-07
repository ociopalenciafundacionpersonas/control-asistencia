(function(){
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function monthLabel(ym){const [y,m]=ym.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'});}
  function activityName(id){return (D.a||[]).find(a=>a.id===id)?.nombre||'Actividad';}
  function dateLabel(x){return x?new Date(x+'T12:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}):'';}

  function userDetail(uid,ym){
    const u=(D.u||[]).find(x=>x.id===uid); if(!u)return;
    const [y,m]=ym.split('-').map(Number), start=ym+'-01', end=new Date(y,m,0).toISOString().slice(0,10);
    const groups={};
    (D.t||[]).filter(t=>t.fecha>=start&&t.fecha<=end&&t.estado!=='excluido'&&t.user_id===uid).forEach(t=>{
      const enrolled=(D.e||[]).find(e=>e.user_id===uid&&e.activity_id===t.activity_id&&e.fecha_inicio<=t.fecha&&(!e.fecha_fin||e.fecha_fin>=t.fecha));
      if(!enrolled)return;
      const k=t.activity_id;
      if(!groups[k])groups[k]={name:activityName(k),attended:0,absent:0,rows:[]};
      const ok=t.estado==='acudio';
      if(ok)groups[k].attended++;else groups[k].absent++;
      groups[k].rows.push({fecha:t.fecha,ok});
    });
    const acts=Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name,'es'));
    const html='<h2>Detalle de asistencia · '+escHtml(u.nombre)+'</h2><p class="muted">'+escHtml(monthLabel(ym))+'</p>'+
      (acts.length?acts.map(a=>{
        const total=a.attended+a.absent,pct=total?Math.round(a.attended/total*100):0;
        return '<div class="card" style="margin:10px 0"><div class="row" style="justify-content:space-between"><div><b>'+escHtml(a.name)+'</b><div class="muted">'+a.attended+' asistencias · '+a.absent+' no asistencias · '+pct+'%</div></div></div>'+
          '<div style="margin-top:8px">'+a.rows.sort((x,z)=>x.fecha.localeCompare(z.fecha)).map(r=>'<div style="padding:5px 0;border-bottom:1px solid #eee">'+(r.ok?'✅':'❌')+' '+escHtml(dateLabel(r.fecha))+' — '+(r.ok?'Acudió':'No acudió')+'</div>').join('')+'</div></div>';
      }).join(''):'<p class="muted">No hay sesiones previstas para esta persona en este mes.</p>')+
      '<div style="text-align:right;margin-top:12px"><button class="secondary" onclick="close()">Cerrar</button></div>';
    modal(html);
  }

  function renderStats(){
    const box=document.getElementById('attendanceStats'); if(!box || typeof D==='undefined') return;
    const ym=box.querySelector('#asMonth')?.value || new Date().toISOString().slice(0,7);
    const start=ym+'-01', [y,m]=ym.split('-').map(Number), end=new Date(y,m,0).toISOString().slice(0,10);
    const query=box.querySelector('#asSearch')?.value||'';const norm=s=>String(s||'').toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g,'');const q=norm(query);const rows=(D.u||[]).filter(u=>norm(u.nombre).includes(q)).map(u=>{
      let expected=0, attended=0, activities=new Set();
      (D.t||[]).filter(t=>t.fecha>=start&&t.fecha<=end&&t.estado!=='excluido'&&t.user_id===u.id).forEach(t=>{
        const enrolled=(D.e||[]).find(e=>e.user_id===u.id&&e.activity_id===t.activity_id&&e.fecha_inicio<=t.fecha&&(!e.fecha_fin||e.fecha_fin>=t.fecha));
        if(!enrolled)return;
        expected++; activities.add(t.activity_id); if(t.estado==='acudio') attended++;
      });
      const pct=expected?Math.round(attended/expected*100):null;
      return {u,expected,attended,pct,activities:activities.size};
    }).filter(r=>r.expected>0).sort((a,b)=>a.u.nombre.localeCompare(b.u.nombre,'es'));
    box.querySelector('#asTitle').textContent='Asistencia por usuario · '+monthLabel(ym);
    box.querySelector('#asBody').innerHTML=rows.length?'<table><thead><tr><th>Usuario</th><th>Actividades</th><th>Sesiones previstas</th><th>Acudió</th><th>% asistencia</th></tr></thead><tbody>'+
      rows.map(r=>'<tr class="asUserRow" data-user="'+escHtml(r.u.id)+'" style="cursor:pointer"><td><b>'+escHtml(r.u.nombre)+'</b></td><td>'+r.activities+'</td><td>'+r.expected+'</td><td>'+r.attended+'</td><td><b>'+r.pct+'%</b></td></tr>').join('')+
      '</tbody></table><p class="muted" style="margin-top:8px">Haz clic en una persona para ver actividades, fechas y asistencias.</p>':'<p class="muted">No hay registros de asistencia para este mes.</p>';
    box.querySelectorAll('.asUserRow').forEach(row=>row.addEventListener('click',()=>userDetail(row.dataset.user,ym)));
  }
  function install(){
    if(typeof D==='undefined'){setTimeout(install,300);return;}
    if(document.getElementById('attendanceStats')){renderStats();return;}
    const home=document.getElementById('home'); if(!home){setTimeout(install,300);return;}
    const card=document.createElement('div'); card.className='card'; card.id='attendanceStats';
    card.innerHTML='<div class="row" style="justify-content:space-between"><div><h2 id="asTitle" style="margin:0 0 4px">Asistencia por usuario</h2><div class="muted">Porcentaje mensual según las sesiones de las actividades a las que está apuntado/a.</div></div><div><label>Mes</label><input id="asMonth" type="month" value="'+new Date().toISOString().slice(0,7)+'"></div></div><div style="margin-top:10px"><input id="asSearch" placeholder="Buscar usuario..." style="width:100%"></div><div id="asBody" style="margin-top:12px"></div>';
    home.appendChild(card);
    card.querySelector('#asMonth').addEventListener('change',renderStats);card.querySelector('#asSearch').addEventListener('input',renderStats);
    const oldLoad=window.load;
    if(typeof oldLoad==='function' && !oldLoad.__attendanceStatsWrapped){
      const wrapped=async function(){const r=await oldLoad.apply(this,arguments);setTimeout(renderStats,0);return r};
      wrapped.__attendanceStatsWrapped=true; window.load=wrapped;
    }
    renderStats();
    setInterval(renderStats,1500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();