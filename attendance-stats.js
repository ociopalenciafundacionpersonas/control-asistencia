(function(){
  const escHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function monthLabel(ym){const [y,m]=ym.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'});}
  function renderStats(){
    const box=document.getElementById('attendanceStats'); if(!box || typeof D==='undefined') return;
    const ym=box.querySelector('#asMonth')?.value || new Date().toISOString().slice(0,7);
    const start=ym+'-01', [y,m]=ym.split('-').map(Number), end=new Date(y,m,0).toISOString().slice(0,10);
    const rows=(D.u||[]).map(u=>{
      let expected=0, attended=0, activities=new Set();
      (D.t||[]).filter(t=>t.fecha>=start&&t.fecha<=end&&t.estado!=='excluido'&&t.user_id===u.id).forEach(t=>{
        const enrolled=(D.e||[]).find(e=>e.user_id===u.id&&e.activity_id===t.activity_id&&e.fecha_inicio<=t.fecha&&(!e.fecha_fin||e.fecha_fin>=t.fecha));
        if(!enrolled) return;
        expected++; activities.add(t.activity_id); if(t.estado==='acudio') attended++;
      });
      const pct=expected?Math.round(attended/expected*100):null;
      return {u,expected,attended,pct,activities:activities.size};
    }).filter(r=>r.expected>0).sort((a,b)=>a.u.nombre.localeCompare(b.u.nombre,'es'));
    box.querySelector('#asTitle').textContent='Asistencia por usuario · '+monthLabel(ym);
    box.querySelector('#asBody').innerHTML=rows.length?'<table><thead><tr><th>Usuario</th><th>Actividades</th><th>Sesiones previstas</th><th>Acudió</th><th>% asistencia</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+escHtml(r.u.nombre)+'</td><td>'+r.activities+'</td><td>'+r.expected+'</td><td>'+r.attended+'</td><td><b>'+r.pct+'%</b></td></tr>').join('')+
      '</tbody></table>':'<p class="muted">No hay registros de asistencia para este mes.</p>';
  }
  function install(){
    if(typeof D==='undefined'){setTimeout(install,300);return;}
    if(document.getElementById('attendanceStats')){renderStats();return;}
    const home=document.getElementById('home'); if(!home){setTimeout(install,300);return;}
    const card=document.createElement('div'); card.className='card'; card.id='attendanceStats';
    card.innerHTML='<div class="row" style="justify-content:space-between"><div><h2 id="asTitle" style="margin:0 0 4px">Asistencia por usuario</h2><div class="muted">Porcentaje mensual según las sesiones de las actividades a las que está apuntado/a.</div></div><div><label>Mes</label><input id="asMonth" type="month" value="'+new Date().toISOString().slice(0,7)+'"></div></div><div id="asBody" style="margin-top:12px"></div>';
    home.appendChild(card);
    card.querySelector('#asMonth').addEventListener('change',renderStats);
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