/* eslint-disable */
// @ts-nocheck
/* Motor do protótipo semifuncional do módulo Estoque e insumos (JavaScript sem framework).
   Gera HTML por strings e delega eventos por data-act. Dados fictícios em localStorage.
   O React só monta/desmonta este motor (ver ../App.tsx). */
/* =====================================================================
   Protótipo navegável — Módulo de Estoque · Clínica Digital UFPE (NUTES)
   Dados fictícios. Estado persistido apenas no navegador (localStorage).
   ===================================================================== */

/* ---------- utilitários ---------- */
const MS=864e5, pad=n=>String(n).padStart(2,'0');
const T0=(()=>{const d=new Date();d.setHours(0,0,0,0);return d})();
const addDays=(n,b=T0)=>{const d=new Date(b);d.setDate(d.getDate()+n);return d};
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseD=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const dayDiff=s=>Math.round((parseD(s)-T0)/MS);
const fD=s=>s?parseD(s).toLocaleDateString('pt-BR'):'—';
const fDT=iso=>{const d=new Date(iso);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
const num=v=>(Math.round((+v||0)*100)/100).toLocaleString('pt-BR');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ROOT=null;
const $=(s,r=ROOT)=>r.querySelector(s);
const nowISO=()=>new Date().toISOString();
const tsAgo=(days,hour=10,min=0)=>{const d=addDays(-days);d.setHours(hour,min,0,0);return d.toISOString()};
let _id=0; const uid=p=>p+Date.now().toString(36)+(++_id).toString(36);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- ícones (traço branco simples, conforme manual §8) ---------- */
const ICONS={
home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
out:'<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
in:'<path d="M17 7L7 17"/><path d="M16 17H7V8"/>',
bell:'<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
download:'<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
alert:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
x:'<path d="M6 6l12 12M18 6L6 18"/>',
menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
building:'<path d="M4 21V5l8-2v18M12 9h8v12M4 21h16M8 8h.01M8 12h.01M8 16h.01"/>',
temp:'<path d="M10 14V5a2 2 0 014 0v9a4 4 0 11-4 0z"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
chat:'<path d="M4 5h16v11H9l-5 4V5z"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
pkg:'<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
chevl:'<path d="m15 18-6-6 6-6"/>', chevr:'<path d="m9 18 6-6-6-6"/>', chevd:'<path d="m6 9 6 6 6-6"/>',
};
const ico=(n,s=20)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;
const seal=(n,c='',s=20)=>`<span class="seal ${c}">${ico(n,s)}</span>`;

/* ---------- semântica de cores (manual §6: sempre cor + rótulo) ---------- */
const PILL={
 ok:['Adequado','var(--status-success)'], repor:['Repor em breve','var(--s-dev)'], critico:['Nível crítico alto','var(--s-ini)'], zerado:['Sem estoque','var(--s-ini)'],
 vencido:['Vencido','var(--s-ini)'], avencer:['A vencer','var(--s-dev)'], valido:['Válido','var(--status-success)'],
 consumo:['Consumo','var(--s-int)'], vencimento:['Perda por validade','var(--s-ini)'], descarte:['Descarte por avaria','var(--s-dev)'],
 emprestimo:['Empréstimo','var(--s-baixo)'], doacao:['Doação','var(--s-av)'], entrada:['Entrada','var(--s-av)'],
 estorno:['Estorno','var(--s-baixo)'], ajuste:['Ajuste de inventário','var(--s-dev)'], devolucao:['Devolução','var(--s-int)'],
 aguardando:['Aguardando troca','var(--s-baixo)'], abandonado:['Prazo vencido — decidir','var(--s-ini)'], trocado:['Troca realizada','var(--status-success)'],
 incorporado:['Incorporado ao estoque','var(--s-av)'], descartado:['Descartado','var(--s-dev)'],
};
const pill=(k,label)=>{const p=PILL[k]||[k,'var(--s-baixo)'];return `<span class="pill" style="--pc:${p[1]}"><i></i>${esc(label||p[0])}</span>`};

/* ---------- categorias de movimentação ---------- */
const MOV_TIPOS=['consumo','vencimento','descarte','emprestimo','doacao','entrada','estorno','ajuste','devolucao'];
const TIPO_SAIDA_USER={consumo:'Consumo',descarte:'Descarte por avaria',emprestimo:'Empréstimo',doacao:'Doação',vencimento:'Perda por validade (lotes vencidos)'};

/* ---------- tipos de alerta (notificações) ---------- */
const NT_TIPOS=[
 {k:'critico',l:'Nível crítico',d:'Nível crítico de 7 ou mais (de 0 a 10), calculado pela cobertura em dias e pelo tempo de reposição',c:'var(--s-ini)',ic:'alert',ico:'re sm'},
 {k:'validade',l:'Validade',d:'Lotes a vencer ou vencidos',c:'var(--s-dev)',ic:'clock',ico:'am sm'},
 {k:'lote',l:'Retirada fora da validade mais próxima',d:'Usuário escolheu um lote que não é o de validade mais próxima',c:'var(--s-dev)',ic:'eye',ico:'am sm',roles:['admin']},
 {k:'baixa_alta',l:'Retirada acima da média',d:'Retirada muito acima da média diária de consumo do insumo',c:'var(--s-ini)',ic:'out',ico:'re sm',roles:['admin']},
 {k:'consumo_baixo',l:'Consumo abaixo do aprendido',d:'Consumo recente bem abaixo da média histórica do insumo',c:'var(--s-int)',ic:'chart',ico:'cy sm',roles:['admin']},
 {k:'abandonado',l:'Recebimento incorreto sem troca',d:'Passaram 45 dias da notificação à empresa sem a troca do produto',c:'var(--s-ini)',ic:'pkg',ico:'re sm',roles:['admin','almoxarife']},
];
const NT=Object.fromEntries(NT_TIPOS.map(t=>[t.k,t]));
const pillN=k=>`<span class="pill"><i style="background:${NT[k].c}"></i>${esc(NT[k].l)}</span>`;
const prefDef=k=>({app:1,email:k==='critico'?1:0,wa:0});
const prefOf=(u,k)=>(S.prefs[u.id]&&S.prefs[u.id][k])||prefDef(k);

/* =====================================================================
   DADOS-SEMENTE (fictícios, relativos à data de hoje)
   ===================================================================== */
const PERFIS={superuser:'Superuser',admin:'Administrador',almoxarife:'Almoxarife',controlador:'Controlador Orçamentário'};
const PERMS=[
 ['saida','Registrar saídas (consumo, pacote, descarte, empréstimo, doação) e devolução','RF-10 a RF-15'],
 ['entrada','Registrar entradas e recebimentos incorretos','RF-18, RF-24, RF-25'],
 ['inventario','Ajustar inventário (contagem física)','RF-17'],
 ['estorno','Estornar movimentações de qualquer usuário','RF-16'],
 ['cad_insumos','Cadastrar insumos, categorias e pacotes','RF-04, RF-06, RF-09'],
 ['cad_usuarios','Cadastrar usuários da unidade','RF-02'],
 ['cad_clinicas','Cadastrar clínicas da rede','RF-01'],
 ['relatorios','Relatórios, curva ABC e exportação','RF-38 a RF-42'],
 ['config','Acessar configurações (permissões e parâmetros da rede)','RF-03'],
 ['orcamento','Ver valores monetários (visão orçamentária)',''],
 ['cad_custo','Editar o custo unitário dos insumos',''],
];
const PERMS_DEF={
 superuser:{saida:0,entrada:0,inventario:0,estorno:0,cad_insumos:0,cad_usuarios:1,cad_clinicas:1,relatorios:1,config:1,orcamento:1,cad_custo:0},
 admin:{saida:1,entrada:1,inventario:1,estorno:1,cad_insumos:1,cad_usuarios:1,cad_clinicas:0,relatorios:1,config:0,orcamento:0,cad_custo:0},
 almoxarife:{saida:1,entrada:1,inventario:1,estorno:1,cad_insumos:0,cad_usuarios:0,cad_clinicas:0,relatorios:0,config:0,orcamento:0,cad_custo:0},
 controlador:{saida:0,entrada:0,inventario:0,estorno:0,cad_insumos:0,cad_usuarios:0,cad_clinicas:0,relatorios:1,config:0,orcamento:1,cad_custo:1},
};
// custo unitário de referência (R$ por unidade de medida) e variação por clínica
const PRECOS={'LUV-M':38.9,'MAS-C':21.5,'GAZ-E':12.4,'ALC-70':9.8,'ANE-L':189,'RES-A2':64.5,'SUG':14.2,'ELE':18.6,'GEL':72,'KIN':24.9,'SOR':6.3,'VAC':35,'TOA':118};
const FATOR={c1:1,c2:1.03,c3:.98};
const UNIDADES=['un','cx','pct','frasco','seringa','rolo','galão','dose','fardo','L','mL','kg'];
const TEMPS={ref:'Refrigerado (2–8 °C)',amb:'Ambiente (15–30 °C)',cong:'Congelado (−20 °C)'};
const ORIGENS={central:'Almoxarifado central',clinica:'Outra clínica',doacao:'Doação externa',outro:'Outro'};
const originLabel=o=>o.tipo==='clinica'?`Outra clínica — ${clinicName(o.clinica)}`:o.tipo==='outro'?`Outro — ${o.texto||'—'}`:o.tipo==='doacao'?`Doação externa${o.texto?' — '+o.texto:''}`:ORIGENS[o.tipo];

const CATALOG=[
 {sku:'LUV-M',nome:'Luva de procedimento M (cx 100)',cat:'EPI',un:'cx',lote:true,temp:null},
 {sku:'MAS-C',nome:'Máscara cirúrgica tripla (cx 50)',cat:'EPI',un:'cx',lote:true,temp:null},
 {sku:'GAZ-E',nome:'Gaze estéril 7,5×7,5 (pct 10)',cat:'Curativo',un:'pct',lote:true,temp:null},
 {sku:'ALC-70',nome:'Álcool 70% (frasco 1 L)',cat:'Antissépticos',un:'frasco',lote:true,temp:null},
 {sku:'ANE-L',nome:'Anestésico lidocaína 2% c/ epinefrina (cx 50)',cat:'Medicamentos',un:'cx',lote:true,temp:null},
 {sku:'RES-A2',nome:'Resina composta A2 (seringa 4 g)',cat:'Material restaurador',un:'seringa',lote:true,temp:null},
 {sku:'SUG',nome:'Sugador descartável (pct 100)',cat:'Descartáveis',un:'pct',lote:true,temp:null},
 {sku:'ELE',nome:'Eletrodo autoadesivo (pct 4)',cat:'Eletroterapia',un:'pct',lote:true,temp:null},
 {sku:'GEL',nome:'Gel condutor p/ ultrassom (galão 5 L)',cat:'Eletroterapia',un:'galão',lote:true,temp:null},
 {sku:'KIN',nome:'Fita elástica kinesio (rolo)',cat:'Fisioterapia',un:'rolo',lote:true,temp:null},
 {sku:'SOR',nome:'Soro fisiológico 0,9% (frasco 500 mL)',cat:'Medicamentos',un:'frasco',lote:true,temp:null},
 {sku:'VAC',nome:'Vacina influenza (dose)',cat:'Imunobiológicos',un:'dose',lote:true,temp:'ref'},
 {sku:'TOA',nome:'Papel toalha interfolhado (fardo)',cat:'Higiene',un:'fardo',lote:false,temp:null},
];
// [sku, lotes[[qtd, validade em dias, código]], consumo/dia, tempo de reposição (dias), antecedência do alerta de validade]
const PLAN={
 c1:[
  ['LUV-M',[[3,210,'LT-2418']],1.3,7,30],['MAS-C',[[24,300,'LT-2390'],[10,400,'LT-2441']],.8,7,30],
  ['GAZ-E',[[40,500,'GZ-118']],2,5,45],['ALC-70',[[9,18,'AL-702']],.4,6,30],
  ['ANE-L',[[2,-5,'AN-551'],[9,12,'AN-560'],[14,190,'AN-577']],.5,10,30],['RES-A2',[[7,95,'RS-210']],.25,14,60],
  ['SUG',[[8,600,'SG-31']],1.1,6,60],['SOR',[[12,240,'SF-909']],.6,7,30],['TOA',[[9,null,'—']],.5,5,0]],
 c2:[
  ['LUV-M',[[70,260,'LT-2431']],1,7,30],['MAS-C',[[18,350,'LT-2402']],.6,7,30],['GAZ-E',[[22,400,'GZ-120']],.7,5,45],
  ['ALC-70',[[10,150,'AL-715']],.3,6,30],['ELE',[[2,420,'EL-77']],.9,9,60],['GEL',[[3,300,'GE-14']],.08,12,60],
  ['KIN',[[14,500,'KN-09']],.35,14,60],['SOR',[[6,200,'SF-871']],.2,7,30],['TOA',[[11,null,'—']],.6,5,0]],
 c3:[
  ['LUV-M',[[20,300,'LT-2440']],.7,7,30],['MAS-C',[[30,380,'LT-2436']],.6,7,30],['GAZ-E',[[16,360,'GZ-121']],.5,5,45],
  ['ALC-70',[[8,240,'AL-720']],.3,6,30],['ELE',[[40,380,'EL-81']],.3,9,60],['GEL',[[9,320,'GE-16']],.05,12,60],
  ['SOR',[[2,160,'SF-902']],.5,7,30],['VAC',[[30,20,'VC-5521'],[40,110,'VC-5588']],1.5,15,30],['TOA',[[14,null,'—']],.4,5,0]],
};

const defPrefs=()=>Object.assign(Object.fromEntries(NT_TIPOS.map(t=>[t.k,prefDef(t.k)])),{resumo:0});
function seed(){
  const R=mulberry(20261008);
  const S={v:7,session:null,orcView:false,
   clinics:[
    {id:'c1',nome:'Clínica-Escola de Odontologia',end:'Campus Recife — Av. Prof. Moraes Rego, s/n',resp:'Profa. Helena Duarte',ativo:true},
    {id:'c2',nome:'Clínica-Escola de Fisioterapia',end:'Campus Recife — Av. Prof. Moraes Rego, s/n',resp:'Prof. Ricardo Vilar',ativo:true},
    {id:'c3',nome:'NPI — Núcleo da Pessoa Idosa',end:'Campus Recife — Av. Prof. Moraes Rego, s/n',resp:'Profa. Sônia Barros',ativo:true}],
   users:[
    {id:'u0',nome:'Coordenação NUTES',email:'superuser@demo.clinicadigital',perfil:'superuser',clinic:null,area:'',ativo:true},
    {id:'u1',nome:'Marina Albuquerque',email:'admin.odonto@demo.clinicadigital',perfil:'admin',clinic:'c1',area:'',ativo:true},
    {id:'u2',nome:'Paulo Teixeira',email:'admin.fisio@demo.clinicadigital',perfil:'admin',clinic:'c2',area:'',ativo:true},
    {id:'u3',nome:'Joana Lacerda',email:'admin.npi@demo.clinicadigital',perfil:'admin',clinic:'c3',area:'',ativo:true},
    {id:'u6',nome:'Rafael Monteiro',email:'almox.odonto@demo.clinicadigital',perfil:'almoxarife',clinic:'c1',area:'',ativo:true},
    {id:'u7',nome:'Sandra Oliveira',email:'almox.fisio@demo.clinicadigital',perfil:'almoxarife',clinic:'c2',area:'',ativo:true},
    {id:'u8',nome:'Beatriz Nogueira',email:'orcamento.odonto@demo.clinicadigital',perfil:'controlador',clinic:'c1',area:'',ativo:true},
    {id:'u9',nome:'Carlos Menezes',email:'orcamento.fisio@demo.clinicadigital',perfil:'controlador',clinic:'c2',area:'',ativo:true},
    {id:'u10',nome:'Lúcia Andrade',email:'orcamento.npi@demo.clinicadigital',perfil:'controlador',clinic:'c3',area:'',ativo:true}],
   perms:JSON.parse(JSON.stringify(PERMS_DEF)),
   cfg:{margem:20,limiteBaixa:3,quedaConsumo:50,prazoAbandono:45},
   cats:{},
   items:[],lots:[],moves:[],receipts:[],requests:[],packages:[],abandoned:[],notifs:[],active:{},audit:[],prefs:{},seq:{nr:8,cod:CATALOG.length+1,ab:3},
  };
  let ln=0;
  for(const cid of Object.keys(PLAN)){
    for(const [sku,lots,cons,lead,antec] of PLAN[cid]){
      const ci=CATALOG.findIndex(x=>x.sku===sku),c=CATALOG[ci];
      const it={id:`${cid}-${sku}`,clinic:cid,cod:'INS-'+String(ci+1).padStart(4,'0'),nome:c.nome,cat:c.cat,un:c.un,lote:c.lote,regTemp:!!c.temp,temp:c.temp,reposicao:lead,antec,ativo:true,custo:Math.round(PRECOS[sku]*FATOR[cid]*100)/100};
      S.items.push(it);
      for(const [q,off,cod] of lots) S.lots.push({id:'lt'+(++ln),item:it.id,lote:cod,val:off===null?null:ymd(addDays(off)),qtd:q});
      const cu=S.users.filter(x=>x.clinic===cid&&x.perfil!=='controlador');
      // histórico de consumo (90 dias, dias úteis)
      for(let d=90;d>=1;d--){
        const dt=addDays(-d); if(dt.getDay()===0||dt.getDay()===6) continue;
        let q=Math.round(cons*7/5*(0.4+R()*1.2));
        if(it.id==='c2-KIN'&&d<=14) q=Math.round(q*.15); // consumo em queda (alerta aprendido)
        if(q<=0){R();continue}
        const u=cu[Math.floor(R()*cu.length)];
        S.moves.push({id:'m'+(++ln),ts:tsAgo(d,8+Math.floor(R()*9),Math.floor(R()*60)),clinic:cid,user:u.id,item:it.id,lot:null,loteTxt:lots[0][2],qtd:-q,tipo:'consumo',motivo:'Atendimento',origem:'manual'});
      }
      if(R()<.4){const q=1+Math.floor(R()*3);S.moves.push({id:'m'+(++ln),ts:tsAgo(10+Math.floor(R()*70),15),clinic:cid,user:cu[0].id,item:it.id,lot:null,loteTxt:lots[0][2],qtd:-q,tipo:R()<.5?'vencimento':'descarte',motivo:'Registro histórico',origem:'manual'})}
    }
    // categorias da clínica (editáveis)
    const used=[...new Set(S.items.filter(i=>i.clinic===cid).map(i=>i.cat))];
    S.cats[cid]=[...used,...(cid==='c1'?['Instrumental']:cid==='c2'?['Órteses']:['Outros'])].map((n,i)=>({id:cid+'k'+i,nome:n,ativo:true}));
  }
  // pacotes (procedimentos padrão)
  const P=(id,clinic,nome,grupo,itens)=>S.packages.push({id,clinic,nome,grupo,ativo:true,itens:itens.map(([sku,q])=>({item:`${clinic}-${sku}`,qtd:q}))});
  P('p1','c1','Turno de restauração em resina (4 pacientes)','Procedimento restaurador',[['LUV-M',.5],['MAS-C',.5],['ANE-L',.2],['RES-A2',1],['SUG',.5],['GAZ-E',2]]);
  P('p2','c1','Turno de profilaxia (6 pacientes)','Procedimento preventivo',[['LUV-M',.5],['MAS-C',.5],['ALC-70',.5],['SUG',.5],['GAZ-E',1]]);
  P('p3','c2','Turno de eletroterapia TENS (6 pacientes)','Fisioterapia',[['ELE',2],['GEL',.1],['ALC-70',.3],['LUV-M',.3]]);
  P('p4','c2','Turno de kinesio taping (4 pacientes)','Fisioterapia',[['KIN',2],['ALC-70',.2],['LUV-M',.3]]);
  P('p5','c3','Campanha de vacinação influenza (20 doses)','Imunização',[['VAC',20],['ALC-70',.5],['GAZ-E',3],['LUV-M',.5]]);
  // requisições (simulação do sistema de solicitações)
  S.requests=[
   {id:'SOL-1042',clinic:'c1',data:ymd(addDays(-5)),itens:[{item:'c1-LUV-M',qtd:20},{item:'c1-MAS-C',qtd:10}]},
   {id:'SOL-1043',clinic:'c1',data:ymd(addDays(-3)),itens:[{item:'c1-RES-A2',qtd:6},{item:'c1-ANE-L',qtd:5}]},
   {id:'SOL-0871',clinic:'c2',data:ymd(addDays(-6)),itens:[{item:'c2-ELE',qtd:12}]},
   {id:'SOL-0455',clinic:'c3',data:ymd(addDays(-4)),itens:[{item:'c3-SOR',qtd:24}]}];
  // notas de recebimento semente (lead time e estorno)
  const mkR=(nr,clinic,daysAgo,lead,origem,rows,extra={})=>{
    const r=Object.assign({id:'NR-'+String(nr).padStart(4,'0'),ts:tsAgo(daysAgo,11),clinic,user:S.users.find(x=>x.clinic===clinic&&x.perfil==='admin').id,origem,carta:null,comprovante:null,pedidoEm:lead==null?null:ymd(addDays(-daysAgo-lead)),recebidoEm:ymd(addDays(-daysAgo)),rows:[],estornada:false},extra);
    for(const [sku,ped,rec,lote,off,lotId] of rows){const it=S.items.find(i=>i.id===`${clinic}-${sku}`);r.rows.push({item:it.id,ped,rec,lote,val:off===null?null:ymd(addDays(off)),lot:lotId||null});}
    S.receipts.push(r);return r;};
  S.lots.push({id:'ltR2',item:'c1-GAZ-E',lote:'GZ-117',val:ymd(addDays(480)),qtd:10});
  S.lots.push({id:'ltR3',item:'c1-SOR',lote:'SF-910',val:ymd(addDays(250)),qtd:12});
  S.lots.find(l=>l.item==='c1-SOR'&&l.lote==='SF-909').qtd=0;
  const C={tipo:'central'};
  mkR(1,'c1',48,7,C,[['MAS-C',30,30,'LT-2390',300],['LUV-M',24,24,'LT-2300',150]]);
  mkR(2,'c1',12,8,C,[['GAZ-E',50,50,'GZ-117',480,'ltR2']]);
  mkR(3,'c1',2,6,C,[['SOR',12,12,'SF-910',250,'ltR3']],{comprovante:'comprovante-NR0003.pdf'});
  mkR(4,'c2',30,9,C,[['ELE',20,20,'EL-70',380]]);
  mkR(5,'c2',60,10,C,[['ELE',20,20,'EL-65',360],['GEL',4,4,'GE-12',300]]);
  mkR(6,'c3',40,15,C,[['VAC',60,60,'VC-5521',20]]);
  mkR(7,'c2',20,null,{tipo:'doacao',texto:'Associação de Amigos da Fisioterapia'},[['GEL',null,2,'GE-13',280]],{carta:'carta-doacao-associacao.pdf'});
  // movimentações dos lotes dedicados às notas NR-0002 (já consumida em parte) e NR-0003 (intacta)
  S.moves.push({id:'m'+(++ln),ts:tsAgo(12,11),clinic:'c1',user:'u6',item:'c1-GAZ-E',lot:'ltR2',loteTxt:'GZ-117',qtd:50,tipo:'entrada',motivo:'Entrada — Almoxarifado central',origem:'nota:NR-0002'});
  S.moves.push({id:'m'+(++ln),ts:tsAgo(8,14),clinic:'c1',user:'u6',item:'c1-GAZ-E',lot:'ltR2',loteTxt:'GZ-117',qtd:-40,tipo:'consumo',motivo:'Atendimento',origem:'manual'});
  S.moves.push({id:'m'+(++ln),ts:tsAgo(2,11),clinic:'c1',user:'u6',item:'c1-SOR',lot:'ltR3',loteTxt:'SF-910',qtd:12,tipo:'entrada',motivo:'Entrada — Almoxarifado central',origem:'nota:NR-0003'});
  // recebimentos incorretos (produtos que o fornecedor não trocou)
  S.abandoned=[
   {id:'AB-0001',clinic:'c1',ts:tsAgo(60,10),user:'u6',desc:'Resina composta A3 (cor diferente da pedida)',qtd:4,un:'seringa',empresa:'Biomed Nordeste',notificadoEm:ymd(addDays(-52)),obs:'Pedido SOL-0988. Empresa informada por e-mail e telefone.',status:'aguardando'},
   {id:'AB-0002',clinic:'c1',ts:tsAgo(21,15),user:'u6',desc:'Luva de procedimento G (tamanho errado)',qtd:6,un:'cx',empresa:'Distribuidora MedPE',notificadoEm:ymd(addDays(-20)),obs:'',status:'aguardando'},
   {id:'AB-0003',clinic:'c2',ts:tsAgo(30,9),user:'u7',desc:'Eletrodo autoadesivo (modelo incompatível)',qtd:3,un:'pct',empresa:'Fisio Suprimentos Ltda.',notificadoEm:ymd(addDays(-28)),obs:'',status:'aguardando'}];
  for(const u of S.users) S.prefs[u.id]=defPrefs();
  S.audit.push({id:'a0',ts:tsAgo(60,9),user:'u0',clinic:null,acao:'Criação',ent:'Rede',det:'Rede Clínica Digital inicializada com 3 clínicas'});
  syncAlerts(S,true);
  S.notifs.forEach((n,i)=>{if(i%3===1)n.lida=true});
  return S;
}

/* =====================================================================
   ESTADO + PERSISTÊNCIA
   ===================================================================== */
const LS='cd-estoque-proto-v7';
let S;
function load(){try{const r=localStorage.getItem(LS);if(r){const o=JSON.parse(r);if(o&&o.v===7)return o}}catch(e){}return null}
function save(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}

/* ---------- acesso / escopo ---------- */
const me=()=>S.users.find(u=>u.id===S.session);
const can=p=>{const u=me();return !!(u&&S.perms[u.perfil]&&S.perms[u.perfil][p])};
const isSuper=()=>me()&&me().perfil==='superuser';
// visão orçamentária = telas somente monetárias (sem quantidades, níveis críticos e validades): Controlador sempre; Superuser quando liga a chave
const budget=()=>{const u=me();return !!(u&&can('orcamento')&&(u.perfil!=='superuser'||S.orcView))};
const brl=v=>'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const clinicName=id=>(S.clinics.find(c=>c.id===id)||{}).nome||'—';
const pessoaTxt=p=>{const u=S.users.find(x=>x.id===p);return u?u.nome:String(p||'—')};
const userName=id=>(S.users.find(u=>u.id===id)||{}).nome||'—';
const itemById=id=>S.items.find(i=>i.id===id);
function scope(){const u=me();if(!u)return[];if(u.perfil!=='superuser')return[u.clinic];return UI.clinic==='all'?S.clinics.map(c=>c.id):[UI.clinic]}
const scopeItems=()=>S.items.filter(i=>i.ativo&&scope().includes(i.clinic));
const scopeLabel=()=>{const s=scope();return s.length>1?'Toda a rede':clinicName(s[0])};
const myItems=()=>S.items.filter(i=>i.ativo&&i.clinic===me().clinic);
const catsOf=cid=>(S.cats[cid]||[]).filter(c=>c.ativo).map(c=>c.nome);
const scopeCats=()=>[...new Set(scope().flatMap(catsOf))].sort();
function findByCode(s,items){s=String(s||'').trim();if(!s)return null;s=s.split(' — ')[0].trim().toLowerCase();
  const dg=s.replace(/\D/g,'').replace(/^0+/,'');
  return items.find(i=>i.cod.toLowerCase()===s)||(dg&&items.find(i=>i.cod.replace(/\D/g,'').replace(/^0+/,'')===dg))||null}

/* ---------- cálculo de estoque ---------- */
const fefo=(a,b)=>(a.val||'9999-12-31').localeCompare(b.val||'9999-12-31');
const isExp=l=>l.val&&dayDiff(l.val)<0;
const itemLots=id=>S.lots.filter(l=>l.item===id&&l.qtd>0).sort(fefo);
const usable=id=>itemLots(id).filter(l=>!isExp(l));
const saldo=id=>itemLots(id).reduce((s,l)=>s+l.qtd,0);
const saldoUtil=id=>usable(id).reduce((s,l)=>s+l.qtd,0);
// consumo líquido (consumo − devoluções − estornos já marcados) entre "fromDays" e "toDays" dias atrás, inclusive
function netCons(id,fromDays,toDays){const a=addDays(-fromDays),b=addDays(-toDays+1);let v=0;
  for(const m of S.moves){if(m.item!==id)continue;const d=new Date(m.ts);if(d<a||d>=b)continue;
    if(m.tipo==='consumo'&&!m.estornado)v-=m.qtd;else if(m.tipo==='devolucao')v-=m.qtd}
  return v}
const consumoDia=it=>Math.max(0,netCons(it.id,30,1))/30;
function leadTime(it){const ds=[];for(const r of S.receipts){if(r.estornada||!r.pedidoEm||!r.recebidoEm)continue;for(const row of r.rows){if(row.item===it.id){const d=Math.round((parseD(r.recebidoEm)-parseD(r.pedidoEm))/MS);if(d>=0)ds.push(d)}}}
  return ds.length?{dias:ds.reduce((a,b)=>a+b,0)/ds.length,n:ds.length}:{dias:it.reposicao,n:0}}
// Nível crítico: nota de 0 (tranquilo) a 10 (muito crítico). Compara a cobertura em dias com o tempo de reposição acrescido da margem.
function nivelCritico(it){
  const su=saldoUtil(it.id);if(su<=0)return 10;
  const c=consumoDia(it);if(!(c>0))return 0;
  const alvo=Math.max(0.5,leadTime(it).dias)*(1+S.cfg.margem/100); // dias de cobertura que "cobrem" a reposição
  const r=(su/c)/alvo; // 1 = cobertura igual ao tempo de reposição; 0 = sem estoque
  return Math.max(0,Math.min(10,Math.round(10*(1-r/3))));
}
function st(it){const s=saldoUtil(it.id);if(s<=0)return 'zerado';const n=nivelCritico(it);if(n>=7)return 'critico';if(n>=5)return 'repor';return 'ok'}
const cobertura=it=>{const c=consumoDia(it);return c>0?saldoUtil(it.id)/c:null};
function expiring(its){const out=[];for(const it of its){if(!it.lote)continue;for(const l of itemLots(it.id)){if(!l.val)continue;const d=dayDiff(l.val);if(d<=it.antec)out.push({it,l,d})}}return out.sort((a,b)=>a.d-b.d)}
const custoU=it=>+it.custo||0;
const valorDe=(it,q)=>q*custoU(it);
const valorSaldo=it=>valorDe(it,saldo(it.id));
const lotValor=x=>x.l.qtd*custoU(x.it);
const movValor=(tipos,dias,cl=scope())=>{const cut=Date.now()-dias*MS;let v=0;for(const m of S.moves){if(!tipos.includes(m.tipo)||m.estornado||!cl.includes(m.clinic)||new Date(m.ts)<cut)continue;const it=itemById(m.item);if(it)v+=-m.qtd*custoU(it)}return Math.max(0,v)};
const notaValor=r=>r.rows.reduce((s,x)=>{const it=itemById(x.item);return s+(it?x.rec*custoU(it):0)},0);
const valCls=(v,antec)=>{if(!v)return 'ok';const d=dayDiff(v);return d<0?'x':d<=antec?'w':'ok'};
const valTag=(v,it)=>v?`<span class="vtag ${valCls(v,it.antec)}">${fD(v)}</span>`:'—';
const proxVal=it=>{if(!it.lote)return null;const l=usable(it.id).find(x=>x.val);return l?{l,d:dayDiff(l.val)}:null};
// aprendizado: média histórica (dias 15–90) × média recente (últimos 14 dias)
function consumoAprendido(it){const base=Math.max(0,netCons(it.id,90,15))/76,rec=Math.max(0,netCons(it.id,14,1))/14;
  const queda=base>0?1-rec/base:0;return{base,rec,queda,baixo:base>=0.15&&queda>=S.cfg.quedaConsumo/100}}
function baixaAlta(it,qtd){const cd=consumoDia(it);if(!(cd>0))return null;const thr=Math.max(S.cfg.limiteBaixa*cd,1);return qtd>thr?{thr,cd,ratio:qtd/cd}:null}
const abDias=a=>Math.round((T0-parseD(a.notificadoEm))/MS);

/* ---------- movimentações ---------- */
function mv(o){const m=Object.assign({id:uid('m'),ts:nowISO(),user:S.session},o);S.moves.push(m);return m}
function aud(acao,ent,det,clinic){S.audit.push({id:uid('a'),ts:nowISO(),user:S.session,clinic:clinic===undefined?(me()?me().clinic:null):clinic,acao,ent,det})}
function addLot(it,lote,val,qtd){
  if(!it.lote){lote='—';val=null}
  let l=S.lots.find(x=>x.item===it.id&&x.lote===lote&&(x.val||null)===(val||null));
  if(l)l.qtd+=qtd;else{l={id:uid('lt'),item:it.id,lote,val:val||null,qtd};S.lots.push(l)}return l}
function doOut(it,qtd,tipo,motivo,origem,pref,extra){
  qtd=+qtd;if(!(qtd>0))return{err:'Informe uma quantidade maior que zero.'};
  let lots=tipo==='vencimento'?itemLots(it.id).filter(isExp):usable(it.id);
  if(pref){const p=lots.find(l=>l.id===pref);if(p)lots=[p,...lots.filter(l=>l!==p)]}
  const tot=lots.reduce((s,l)=>s+l.qtd,0);
  if(tot<qtd)return{err:tipo==='vencimento'?`Só há ${num(tot)} ${it.un} em lotes vencidos.`:`Saldo utilizável insuficiente: disponível ${num(tot)} ${it.un}.`};
  let rest=qtd;const ms=[];
  for(const l of lots){if(rest<=0)break;const t=Math.min(l.qtd,rest);l.qtd-=t;rest-=t;ms.push(mv(Object.assign({item:it.id,clinic:it.clinic,lot:l.id,loteTxt:l.lote,qtd:-t,tipo,motivo,origem},extra||{})))}
  return{ok:1,moves:ms}}

/* ---------- alertas / notificações ---------- */
function pushNotif(S_,o){S_.notifs.unshift(Object.assign({id:uid('n'),ts:nowISO(),lida:false},o))}
function syncAlerts(S_){
  const prev=S;S=S_; // permite chamar durante seed()
  const cur={};
  for(const it of S.items){if(!it.ativo)continue;
    const k=st(it);
    if(k==='critico'||k==='zerado'){cur['crit:'+it.id]=1;if(!S.active['crit:'+it.id])pushNotif(S,{clinic:it.clinic,tipo:'critico',titulo:`Nível crítico: ${it.nome}`,texto:`Nível crítico ${nivelCritico(it)} de 10: cobertura de ${num(cobertura(it)||0)} dia(s) para um tempo de reposição de ${num(leadTime(it).dias)} dia(s) (saldo utilizável de ${num(saldoUtil(it.id))} ${it.un}). Repor o item.`,ref:it.id})}
    if(it.lote)for(const l of itemLots(it.id)){if(!l.val)continue;const d=dayDiff(l.val);if(d<=it.antec){const key='val:'+l.id;cur[key]=1;if(!S.active[key])pushNotif(S,{clinic:it.clinic,tipo:'validade',titulo:d<0?`Lote vencido: ${it.nome}`:`A vencer: ${it.nome}`,texto:`Lote ${l.lote} (${num(l.qtd)} ${it.un}) ${d<0?`venceu há ${-d} dia(s)`:`vence em ${d} dia(s)`} — ${fD(l.val)}.`,ref:it.id})}}
    const ca=consumoAprendido(it);
    if(ca.baixo){const key='low:'+it.id;cur[key]=1;if(!S.active[key])pushNotif(S,{clinic:it.clinic,roles:['admin'],tipo:'consumo_baixo',titulo:`Consumo abaixo do aprendido: ${it.nome}`,texto:`Média histórica de ${num(ca.base)}/dia; nos últimos 14 dias, ${num(ca.rec)}/dia (queda de ${Math.round(ca.queda*100)}%). Verifique se houve falta de registro, mudança de rotina ou risco de validade.`,ref:it.id})}}
  for(const a of S.abandoned){if(a.status!=='aguardando')continue;if(abDias(a)>=S.cfg.prazoAbandono){const key='aband:'+a.id;cur[key]=1;if(!S.active[key])pushNotif(S,{clinic:a.clinic,roles:['admin','almoxarife'],tipo:'abandonado',titulo:`Produto sem troca há ${abDias(a)} dias: ${a.desc}`,texto:`${a.empresa} foi notificada em ${fD(a.notificadoEm)} e não trocou o produto. Decida: incorporar ao estoque da clínica ou descartar.`,ref:a.id})}}
  S.active=cur;S=prev;
}
function visibleNotifs(){const u=me();return S.notifs.filter(n=>{const p=prefOf(u,n.tipo);if(!p.app)return false;
  if(u.perfil==='superuser')return true;
  return n.clinic===u.clinic&&(!n.roles||n.roles.includes(u.perfil))})}
const unread=()=>visibleNotifs().filter(n=>!n.lida).length;
function commit(msg,type,act){syncAlerts(S);save();render();if(msg)toast(msg,type,act)}
// desfazer imediato logo após registrar uma saída (mantém os dois lançamentos no histórico)
function undoOut(moves,it){let n=0;for(const m of moves){if(m.estornado)continue;const l=S.lots.find(x=>x.id===m.lot);if(l)l.qtd+=-m.qtd;m.estornado=true;n++;
    mv({item:m.item,clinic:m.clinic,lot:m.lot,loteTxt:m.loteTxt,qtd:-m.qtd,tipo:'estorno',motivo:'Desfeito logo após o registro',origem:'estorno de '+m.id,estornoDe:m.id})}
  if(n){aud('Estorno','Movimentação',`${it.nome}: saída desfeita logo após o registro`,it.clinic);commit('Saída desfeita. O estoque voltou ao valor anterior.')}}

/* =====================================================================
   UI: estado de tela, rascunhos, helpers
   ===================================================================== */
const UI={page:'painel',clinic:'all',tabs:{},limit:60,net:'ok',loading:false,okPages:{}};
let D={}; // rascunhos de formulários (nome.pontilhado)
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
function setP(o,p,v){const ks=p.split('.');let a=o;ks.forEach((k,i)=>{if(i===ks.length-1)a[k]=v;else{if(a[k]==null||typeof a[k]!=='object')a[k]=/^\d+$/.test(ks[i+1])?[]:{};a=a[k]}})}
const dv=(p,def='')=>{const v=getP(D,p);return v===undefined?def:v};
function selOpts(opts,cur,ph){return (ph!==undefined?`<option value="">${esc(ph)}</option>`:'')+opts.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(l)}</option>`}).join('')}
const tabOf=(k,def)=>UI.tabs[k]||def;
const tabsHtml=(k,list,def,extra='')=>`<div class="tabbar"><div class="tabs" role="tablist" aria-label="Seções da página">${list.map(t=>{const on=tabOf(k,def)===t[0];return `<button class="tab ${on?'on':''}" id="tab-${k}-${t[0]}" role="tab" aria-selected="${on}" tabindex="${on?0:-1}" data-act="tab" data-k="${k}" data-v="${t[0]}">${esc(t[1])}</button>`}).join('')}</div>${extra?`<div class="tabs-extra">${extra}</div>`:''}</div>`;
function toast(m,t,act){const e=document.createElement('div');e.className='toast '+(t==='e'?'e':'');if(t==='e')e.setAttribute('role','alert');
  e.innerHTML=ico(t==='e'?'alert':'check',16)+'<span class="tm"></span>'+(act?'<button type="button" class="tact"></button>':'')+`<button type="button" class="tx" aria-label="Fechar aviso">${ico('x',14)}</button>`;
  e.querySelector('.tm').textContent=m;let tm;const kill=()=>{clearTimeout(tm);e.remove()};const arm=()=>{clearTimeout(tm);tm=setTimeout(kill,t==='e'?9000:act?8000:4800)};
  e.querySelector('.tx').onclick=kill;if(act){const ab=e.querySelector('.tact');ab.textContent=act.label;ab.onclick=()=>{kill();act.fn()}}
  e.addEventListener('mouseenter',()=>clearTimeout(tm));e.addEventListener('mouseleave',arm);e.addEventListener('focusin',()=>clearTimeout(tm));e.addEventListener('focusout',arm);
  $('#est-toasts').appendChild(e);arm()}
/* ---------- exportação em PDF e Excel (.xlsx) ---------- */
/*LOCAL_DL*/function localDownload(blob,filename){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},600)}/*END_LOCAL_DL*/
async function deliverFile(blob,filename){localDownload(blob,filename);toast(`${filename} gerado.`)}
function pdfFromRows({title,rows,meta=[]}){
  const {jsPDF}=window.jspdf;const cols=rows[0].length;
  const doc=new jsPDF({orientation:cols>6?'landscape':'portrait',unit:'pt',format:'a4'});const W=doc.internal.pageSize.getWidth();
  doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(77,12,116);doc.text(title,36,40);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(88,89,91);
  const lines=[`Clínica Digital UFPE · ${scopeLabel()}`,`Gerado em ${fDT(nowISO())} por ${me().nome}`,...meta];
  lines.forEach((t,k)=>doc.text(t,36,53+k*11));
  doc.autoTable({head:[rows[0]],body:rows.slice(1),startY:62+lines.length*11,margin:{left:36,right:36,bottom:40},theme:'grid',
    styles:{fontSize:8,cellPadding:3,textColor:[43,43,46],lineColor:[233,233,236],overflow:'linebreak'},
    headStyles:{fillColor:[105,19,157],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[246,246,248]},
    didDrawPage:()=>{doc.setFontSize(8);doc.setTextColor(88,89,91);doc.text(`Página ${doc.internal.getNumberOfPages()}`,W-36,doc.internal.pageSize.getHeight()-20,{align:'right'});doc.text('Inovação que Cuida, Transformação que Educa',36,doc.internal.pageSize.getHeight()-20)}});
  return doc.output('blob')}
function xlsxFromRows({title,rows,meta=[]}){
  const aoa=[[title],[`Clínica Digital UFPE · ${scopeLabel()}`],[`Gerado em ${fDT(nowISO())} por ${me().nome}`],...meta.map(m=>[m]),[],...rows];
  const ws=XLSX.utils.aoa_to_sheet(aoa);const off=aoa.length-rows.length;
  ws['!cols']=rows[0].map((_,c)=>({wch:Math.min(48,Math.max(...rows.map(r=>String(r[c]??'').length),10)+2)}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,title.replace(/[\\\/?*\[\]:]/g,' ').slice(0,31)||'Dados');
  return new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
const CDN={pdf:['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'],xlsx:['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js']};
const loadScript=u=>new Promise((ok,no)=>{if(document.querySelector(`script[data-est-lib="${u}"]`))return ok();const s=document.createElement('script');s.src=u;s.dataset.estLib=u;s.onload=ok;s.onerror=()=>no(new Error(u));document.head.appendChild(s)});
async function ensureLib(fmt){for(const u of CDN[fmt])await loadScript(u)}
async function exportData(fmt,spec){
  if(UI.net==='fail'){toast('Falha ao gerar o arquivo (conexão simulada). Tente novamente.','e');return}
  if(UI.net==='slow')await new Promise(r=>setTimeout(r,900));
  if(!spec||!spec.rows||spec.rows.length<2){toast('Não há dados para exportar com os filtros atuais.','e');return}
  try{await ensureLib(fmt)}catch(err){}
  if(fmt==='pdf'&&!(window.jspdf&&window.jspdf.jsPDF)){toast('A biblioteca de PDF não carregou. Verifique a conexão e tente de novo.','e');return}
  if(fmt==='xlsx'&&!window.XLSX){toast('A biblioteca de Excel não carregou. Verifique a conexão e tente de novo.','e');return}
  try{await deliverFile(fmt==='pdf'?pdfFromRows(spec):xlsxFromRows(spec),`${spec.name}-${ymd(T0)}.${fmt}`)}
  catch(err){toast('Não foi possível gerar o arquivo.','e')}}
const expButtons=(src,id)=>`<button class="btn sec" data-act="exp" data-src="${src}" data-fmt="pdf" ${id?`data-id="${id}"`:''}>${ico('file',18)}Exportar PDF</button><button class="btn sec" data-act="exp" data-src="${src}" data-fmt="xlsx" ${id?`data-id="${id}"`:''}>${ico('download',18)}Exportar Excel</button>`;
const EXPORT_TITLES={consumo:'Relatório de consumo',perdas:'Relatório de perdas','curva-abc':'Curva ABC por quantidade consumida',movimentacoes:'Movimentações'};
const pageHead=(t,sub,acts)=>`<div class="ph"><div><h1>${t}</h1>${sub?`<p class="muted">${sub}</p>`:''}</div>${acts?`<div class="acts noprint">${acts}</div>`:''}</div>`;
/* estados de tela: mesmos padrões do shell (LoadingState, EmptyState, ErrorState) */
const emptyState=({icon='list',title='Nenhum registro encontrado',desc='',action=''}={})=>`<div class="state"><span class="stc">${ico(icon,24)}</span><p class="stt">${esc(title)}</p>${desc?`<p>${esc(desc)}</p>`:''}${action?`<div class="sta">${action}</div>`:''}</div>`;
const loadingState=(m='Carregando dados...')=>`<div class="state ld" role="status"><span class="spin" aria-hidden="true"></span><p>${esc(m)}</p></div>`;
const errorState=({title='Ocorreu um erro ao carregar os dados',msg='Não foi possível completar a requisição. Tente novamente.'}={})=>`<div class="state er" role="alert"><div class="erb">${ico('alert',20)}<div><p class="stt">${esc(title)}</p><p>${esc(msg)}</p><button type="button" class="btn sm ghost" data-act="net-retry">${ico('undo',14)}Tentar novamente</button></div></div></div>`;
const noPerm=()=>`<div class="card">${emptyState({icon:'shield',title:'Sem permissão',desc:`O perfil ${PERFIS[me().perfil]} não tem acesso a esta área.`})}</div>`;
const table=(head,rows,empty='Nenhum registro encontrado.')=>`<div class="tw" tabindex="0" role="group" aria-label="Tabela com rolagem horizontal"><table class="t"><thead><tr>${head.map(h=>{const [t,c,a]=Array.isArray(h)?h:[h,/^(Qtd|Saldo|Nível|Cobert|Itens|Dias|Qt|Lotes a|Lotes v|Em nível)/.test(h)?'num':'',''];return `<th scope="col" ${c?`class="${c}"`:''} ${a?`aria-sort="${a}"`:''}>${t===''?'<span class="sr">Ações</span>':t}</th>`}).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${head.length}">${empty.startsWith('<')?empty:emptyState({title:empty})}</td></tr>`}</tbody></table></div>`;
const codeField=(id,path,items)=>`<input id="${id}" type="text" list="dl-${id}" autocomplete="off" required placeholder="Digite ou escolha o código (ex.: INS-0001)" value="${esc(dv(path))}" data-d="${path}" data-r="1" data-enter="1"><datalist id="dl-${id}">${items.map(i=>`<option value="${esc(i.cod)}" label="${esc(i.nome)}"></option>`).join('')}</datalist>`;
const itemCard=(it)=>{const pv=proxVal(it);return `<div class="callout i full" style="grid-column:1/-1"><b>${esc(it.nome)}</b> · ${esc(it.cod)} · ${esc(it.cat)}<br>Saldo utilizável: <b>${num(saldoUtil(it.id))} ${esc(it.un)}</b>${pv?` · validade mais próxima: ${valTag(pv.l.val,it)} (lote ${esc(pv.l.lote)})`:''}</div>`};
const notFound=(c)=>c?`<div class="callout e full" style="grid-column:1/-1">Nenhum insumo com o código “${esc(c)}” nesta clínica.</div>`:'';

/* ---------- modal ---------- */
let MFOCUS=null;
function modal(title,body,wide){if(!$('#est-modal').innerHTML){const a=document.activeElement;MFOCUS=a&&a.dataset?{eid:a.id,act:a.dataset.act,id:a.dataset.id,k:a.dataset.k,v:a.dataset.v}:null}$('#est-app').inert=true;$('#est-modal').innerHTML=`<div class="mbg" data-act="mbg"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button class="ib" data-act="mclose" aria-label="Fechar">${ico('x')}</button></div><div class="mb">${body}</div></div></div>`;fixForms();const f=$('#est-modal input:not([type=hidden]):not([readonly]),#est-modal select,#est-modal textarea');if(f&&!/Mobi/.test(navigator.userAgent))f.focus();else{const m=$('#est-modal .modal');if(m){m.tabIndex=-1;m.focus()}}}
function closeModal(){$('#est-modal').innerHTML='';$('#est-app').inert=false;const o=MFOCUS;MFOCUS=null;
  setTimeout(()=>{let el=null;if(o){if(o.eid)el=document.getElementById(o.eid);if(!el&&o.act)el=[...ROOT.querySelectorAll(`[data-act="${o.act}"]`)].find(x=>x.dataset.id===o.id&&x.dataset.k===o.k&&x.dataset.v===o.v)||ROOT.querySelector(`[data-act="${o.act}"]`)}(el||$('#est-main'))?.focus({preventScroll:false})},0)}
function fieldHtml(f,v,hidden){
  const val=v===undefined?(f.def===undefined?'':f.def):v;const req=f.req?'required':'';const nm=`name="${f.k}"`;
  const sh=f.showIf?`data-showif="${f.showIf}"`:'';const hd=hidden?'hide':'';
  let c='';
  if(f.t==='select')c=`<select ${nm} ${req}>${selOpts(f.opts,val,f.ph)}</select>`;
  else if(f.t==='check')return `<label class="chk ${hd}" ${sh} style="grid-column:1/-1"><input type="checkbox" ${nm} ${val?'checked':''}> <span>${esc(f.l)}${f.h?` <small class="muted">— ${esc(f.h)}</small>`:''}</span></label>`;
  else if(f.t==='textarea')c=`<textarea ${nm} ${req}>${esc(val)}</textarea>`;
  else c=`<input type="${f.t||'text'}" ${nm} value="${esc(val)}" ${req} ${f.ro?'readonly':''} ${f.step?`step="${f.step}"`:f.t==='number'?'step="any"':''} ${f.min!==undefined?`min="${f.min}"`:''}>`;
  return `<label class="f ${f.full?'full':''} ${hd}" ${sh}><span>${esc(f.l)}${f.req?'<b class="rq" aria-hidden="true"> *</b>':''}</span>${c}${f.h?`<small>${esc(f.h)}</small>`:''}</label>`}
function readForm(form,fields){const o={};for(const f of fields){if(f.ro)continue;const e=form.elements[f.k];if(!e)continue;o[f.k]=f.t==='check'?e.checked:f.t==='number'?(e.value===''?null:+e.value):e.value}return o}
const FORMS={}; // submit handlers
/* ---------- validação: erro no próprio campo (padrão FormField do shell) ---------- */
let FEID=0;
function clearErrs(f){f.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby')});f.querySelectorAll('.ferr').forEach(x=>x.remove());f.querySelectorAll('tr.rowerr').forEach(x=>x.remove());const b=f.querySelector('.err');if(b){b.classList.add('hide');b.textContent=''}}
function fieldErr(el,msg){const id='fe-'+(++FEID);const p=document.createElement('p');p.className='ferr';p.id=id;p.setAttribute('role','alert');p.innerHTML=ico('alert',14)+'<span></span>';p.lastChild.textContent=msg;const td=el.closest('td');if(td&&td.closest('table')){const tr=td.parentElement;let er=tr.nextElementSibling;if(!er||!er.classList.contains('rowerr')){er=document.createElement('tr');er.className='rowerr';er.innerHTML=`<td colspan="${tr.children.length}"></td>`;tr.after(er)}er.firstChild.appendChild(p)}else(el.closest('label.f,.f')||el.parentElement).appendChild(p);el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',id)}
function formBanner(f,msg){let b=f.querySelector('.err');if(!b){b=document.createElement('div');b.className='err';b.setAttribute('role','alert');const mf=f.querySelector('.mf');mf?mf.before(b):f.appendChild(b)}b.innerHTML=ico('alert',16)+'<span></span>';b.lastChild.textContent=msg;b.classList.remove('hide')}
function formFail(f,msg,key){clearErrs(f);const el=key&&(f.querySelector(`[data-d="${key}"]`)||f.querySelector(`[data-file="${key}"]`)||f.querySelector(`[name="${key}"]`));if(el){fieldErr(el,msg);el.focus();return}formBanner(f,msg)}
function validateRequired(f){clearErrs(f);const miss=[...f.querySelectorAll('[required]')].filter(el=>!el.disabled&&!el.closest('.hide')&&!String(el.value??'').trim());if(!miss.length)return true;
  miss.forEach(el=>fieldErr(el,'Campo obrigatório.'));formBanner(f,miss.length===1?'Há 1 campo obrigatório sem preenchimento.':`Há ${miss.length} campos obrigatórios sem preenchimento.`);miss[0].focus();return false}
const fixForms=()=>ROOT.querySelectorAll('form[data-form]').forEach(f=>{f.noValidate=true});
function setBusy(b,on){if(!b)return;b.classList.toggle('busy',on);b.disabled=on;if(on)b.setAttribute('aria-busy','true');else b.removeAttribute('aria-busy')}
function formModal(title,fields,vals,onSave,{wide=false,submit='Salvar',extra=''}={}){
  const id=uid('fm');
  FORMS[id]=(form)=>{const v=readForm(form,fields);const e=onSave(v);if(e)formFail(form,e);else closeModal()};
  const valOf=k=>{const f=fields.find(x=>x.k===k);const v=vals?vals[k]:undefined;return v===undefined?f.def:v};
  modal(title,`<form data-form="${id}"><div class="fg">${fields.map(f=>fieldHtml(f,vals?vals[f.k]:undefined,f.showIf&&!valOf(f.showIf))).join('')}</div>${extra}<div class="mf"><button type="button" class="btn sec" data-act="mclose">Cancelar</button><button class="btn" type="submit">${submit}</button></div></form>`,wide)}


/* =====================================================================
   BARRA DO MÓDULO  (o shell já fornece menu lateral, cabeçalho, tema, usuário e rodapé)
   ===================================================================== */
const NAVS=[
 ['painel','Painel','home',()=>1],['estoque','Estoque','box',()=>1],['saida','Saídas','out',()=>can('saida')],['dev','Devolução','undo',()=>can('saida')],['entrada','Entradas','in',()=>can('entrada')||budget()],
 ['mov','Movimentações','list',()=>1],['rel','Relatórios','chart',()=>can('relatorios')],
 ['cad','Cadastros','building',()=>can('cad_insumos')||can('cad_usuarios')||can('cad_clinicas')||can('cad_custo')],['conf','Configurações','cog',()=>can('config')],
];
const PAGE_IDS=[...NAVS.map(n=>n[0]),'notif'];
const crumb=()=>{if(UI.page==='notif')return 'Notificações';const n=NAVS.find(i=>i[0]===UI.page);return n?n[1]:'Painel'};
const HIDDEN_PAGES=['notif']; // páginas fora da navegação (acesso pelo sino)
function can_page(p){if(HIDDEN_PAGES.includes(p))return !(p==='notif'&&budget());const n=NAVS.find(i=>i[0]===p);return n?n[3]():false}
const DEMO_USERS=[['u0','Superuser'],['u1','Administrador'],['u6','Almoxarife'],['u8','Controlador Orçamentário']];
const DEFAULT_USER='u1';

/* ---------- integração com o shell: rota /supplies/<tela> + eventos do shell ---------- */
let HOST={standalone:false};
let lastPath=null;
const basePath=()=>HOST.standalone?'':'/supplies';
const pathOf=p=>basePath()+(p==='painel'?'':'/'+p)||'/';
function pageFromPath(pn){const b=basePath();if(b&&pn!==b&&!pn.startsWith(b+'/'))return null;const seg=pn.slice(b.length).split('/').filter(Boolean)[0];return seg?(PAGE_IDS.includes(seg)?seg:'painel'):'painel'}
function syncHost(){
  const pn=pathOf(UI.page);if(pn===lastPath)return;lastPath=pn;
  if(HOST.standalone){try{history.replaceState(null,'',pn)}catch(e){}return}
  window.dispatchEvent(new CustomEvent('mfe-navigated',{detail:{pathname:pn,search:''}}));
}
function onShellNav(e){
  const pn=e.detail&&e.detail.pathname;if(typeof pn!=='string')return;
  const p=pageFromPath(pn);if(!p)return;lastPath=pathOf(p);
  if(p!==UI.page&&can_page(p)){UI.page=p;UI.fm=1;render()}
}

const initials=n=>n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
function vShell(){
  const u=me(),un=unread();
  const nav=NAVS.filter(i=>i[3]()).map(i=>`<button class="mn" data-act="go" data-p="${i[0]}" ${UI.page===i[0]?'aria-current="page"':''}>${ico(i[2],16)}<span>${i[1]}</span></button>`).join('');
  const bell=budget()?'':`<button class="ib" data-act="go" data-p="notif" aria-label="Notificações (${un} não lidas)" title="Notificações" ${UI.page==='notif'?'aria-current="page" style="background:var(--surface-muted)"':''}>${ico('bell',18)}${un?`<span class="badge">${un}</span>`:''}</button>`;
  const clinicSel=isSuper()?`<label><span>Visão</span><select data-act="clinic" aria-label="Visão da rede">${selOpts([['all','Toda a rede'],...S.clinics.map(c=>[c.id,c.nome])],UI.clinic)}</select></label>`:`<span>Clínica: <b>${u.clinic?esc(clinicName(u.clinic)):'Toda a rede'}</b></span>`;
  const orcSw=u.perfil==='superuser'&&can('orcamento')?`<label class="orcsw"><span class="sw"><input type="checkbox" data-act="orc-toggle" ${S.orcView?'checked':''} aria-label="Visão orçamentária"><span></span></span><span><b>Visão orçamentária</b></span></label>`:'';
  const orcPill=budget()?`<span class="orcpill" title="Valores monetários visíveis nesta sessão">${ico('chart',15)}<span>Visão orçamentária</span></span>`:'';
  const simOpen=UI.simOpen!==undefined?UI.simOpen:matchMedia('(min-width:769px)').matches;
  const sim=`<details class="sim noprint" ${simOpen?'open':''}><summary><span class="tag">${ico('shield',14)}Simulação</span><span class="simsum">${esc(PERFIS[u.perfil])}${UI.net!=='ok'?' · conexão '+(UI.net==='slow'?'lenta':'com falha'):''}</span></summary>
    <div class="simb"><label><span>Perfil</span><select data-act="simperfil" aria-label="Perfil simulado">${selOpts(DEMO_USERS.map(([id,n])=>[id,n]),S.session)}</select></label>
    ${clinicSel}${orcSw}${orcPill}
    <label><span>Conexão</span><select data-act="net" aria-label="Conexão simulada, para ver os estados de carregamento e de erro">${selOpts([['ok','Normal'],['slow','Lenta'],['fail','Com falha']],UI.net)}</select></label>
    <span class="sp"></span><span>Dados fictícios · <a href="#" data-act="reset">reiniciar demonstração</a></span></div></details>`;
  return `<div id="est-main" role="region" aria-label="Estoque e insumos" tabindex="-1"><div class="ctx noprint"><nav class="mnav" aria-label="Seções de Estoque e insumos">${nav}</nav>${bell}</div>${sim}<div class="content" id="page" aria-busy="${UI.loading}">${pageBody()}</div></div>`}
function pageBody(){
  const hd=`<div class="ph"><div><h1>${esc(crumb())}</h1></div></div>`;
  if(UI.loading)return hd+loadingState(`Carregando ${crumb().toLowerCase()}...`);
  if(UI.net==='fail'&&!UI.okPages[UI.page])return hd+errorState({title:`Não foi possível carregar ${crumb().toLowerCase()}`,msg:'O servidor não respondeu (falha simulada). Nenhum dado foi alterado.'});
  return vPage()}
function vPage(){const P={painel:vPainel,estoque:vEstoque,saida:vSaida,dev:vDevolucao,entrada:vEntrada,notif:vNotif,mov:vMov,rel:vRel,cad:vCad,conf:vConf};return (P[UI.page]||vPainel)()}
let LASTP=null,LT=0;
const startLoad=(ms,quiet)=>{UI.loading=true;clearTimeout(LT);LT=setTimeout(()=>{UI.loading=false;render()},ms);if(!quiet)render()};
let TITLE0='';const TITLE_SUFFIX=' · Estoque e insumos · Clínica Digital UFPE';
function render(){
  if(!ROOT)return;
  const act=document.activeElement;const aid=act&&act.id,ss=act&&act.selectionStart,se=act&&act.selectionEnd;const sy=window.scrollY;
  if(!can_page(UI.page))UI.page='painel';
  if(UI.page!==LASTP){LASTP=UI.page;if(UI.net==='fail')delete UI.okPages[UI.page];if(UI.net==='slow')startLoad(1000,true)}
  tipHide();
  $('#est-app').innerHTML=vShell();
  fixForms();
  const nv=$('.mnav');if(nv){const ac=nv.querySelector('[aria-current]');if(ac)nv.scrollLeft=Math.max(0,ac.offsetLeft-(nv.clientWidth-ac.offsetWidth)/2);const fade=()=>{nv.classList.toggle('fl',nv.scrollLeft>4);nv.classList.toggle('fr',nv.scrollLeft+nv.clientWidth<nv.scrollWidth-4)};fade();nv.addEventListener('scroll',fade,{passive:true})}
  if(aid){const e=document.getElementById(aid);if(e){e.focus();try{if(ss!=null)e.setSelectionRange(ss,se)}catch(_){}}}
  ROOT.querySelectorAll('.chscroll').forEach(e=>{e.scrollLeft=e.scrollWidth});
  document.title=crumb()+TITLE_SUFFIX;
  ROOT.querySelectorAll('.t tbody tr').forEach(tr=>{const nm=((tr.querySelector('td:first-child b')||tr.querySelector('td:first-child'))||{}).textContent;if(!nm)return;tr.querySelectorAll('td.act button:not([aria-label])').forEach(b=>{const t=b.textContent.trim();if(t)b.setAttribute('aria-label',t+': '+nm.trim())})});
  window.scrollTo(0,sy);
  if(UI.fm){UI.fm=0;const m=$('#est-main');if(m)m.focus({preventScroll:true})}
  if(UI.focusSel){const t=$(UI.focusSel);UI.focusSel=null;if(t)t.focus({preventScroll:true})}
  syncHost();
}


/* =====================================================================
   PAINEL
   ===================================================================== */
function weeklyQty(ids,weeks=8){const set=new Set(ids);const out=[];
  for(let w=weeks-1;w>=0;w--){const a=addDays(-7*(w+1)+1),b=addDays(-7*w+1);let v=0;
    for(const m of S.moves){if(!set.has(m.item))continue;const d=new Date(m.ts);if(d<a||d>=b)continue;
      if(m.tipo==='consumo'&&!m.estornado)v-=m.qtd;else if(m.tipo==='devolucao')v-=m.qtd}
    out.push({l:`${pad(a.getDate())}/${pad(a.getMonth()+1)}`,v:Math.max(0,v)})}
  return out}
function barChart(data,{h=190,color='var(--roxo)',unit=''}={}){
  const bw=64,pl=8,pb=26,pt=18,W=pl*2+bw*data.length,mx=Math.max(...data.map(d=>d.v),1);
  return `<div class="chscroll" tabindex="0" role="region" aria-label="Gráfico de consumo semanal; role para o lado para ver semanas anteriores"><svg class="chart" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" style="min-width:${W}px" role="img" aria-label="Gráfico de barras do consumo semanal">${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${pt+(h-pt-pb)*(1-f)}" y2="${pt+(h-pt-pb)*(1-f)}" stroke="var(--line)"/>`).join('')}
   ${data.map((d,i)=>{const bh=(h-pt-pb)*d.v/mx,x=pl+i*bw+bw*.18,y=h-pb-bh;return `<g><rect x="${x}" y="${y}" width="${bw*.64}" height="${Math.max(bh,1)}" rx="4" fill="${color}"><title>Semana de ${esc(d.l)}: ${num(d.v)} ${esc(unit)}</title></rect><text x="${x+bw*.32}" y="${h-9}" text-anchor="middle">${esc(d.l)}</text><text x="${x+bw*.32}" y="${y-5}" text-anchor="middle" style="font-weight:700;fill:var(--roxo-esc)">${num(d.v)}</text></g>`}).join('')}</svg></div>`}
function chartCard(){
  const sup=isSuper();const ck=sup?(dv('pn.clinic')||(scope().length>1?'all':scope()[0])):me().clinic;
  const cids=ck==='all'?S.clinics.map(c=>c.id):[ck];
  const pool=S.items.filter(i=>i.ativo&&cids.includes(i.clinic));const by=new Map();pool.forEach(i=>{if(!by.has(i.cod))by.set(i.cod,i)});
  const list=[...by.values()].sort((a,b)=>a.nome.localeCompare(b.nome));
  let cod=dv('pn.cod');if(!by.has(cod))cod=[...by.values()].sort((a,b)=>consumoDia(b)-consumoDia(a))[0]?.cod;
  const rep=by.get(cod);const data=rep?weeklyQty(pool.filter(i=>i.cod===cod).map(i=>i.id),13):[];
  return `<div class="card"><div class="chd"><h2>Consumo semanal</h2></div>
   <div class="filters noprint" style="margin-bottom:8px">${sup?`<label class="f"><span>Clínica</span><select data-d="pn.clinic" data-r="1">${selOpts([['all','Toda a rede'],...S.clinics.map(c=>[c.id,c.nome])],ck)}</select></label>`:''}
   <label class="f"><span>Insumo</span><select data-d="pn.cod" data-r="1">${selOpts(list.map(i=>[i.cod,`${i.cod} · ${i.nome}`]),cod)}</select></label></div>
   ${rep?barChart(data,{unit:rep.un}):emptyState({icon:'chart',title:'Sem insumos nesta seleção',desc:'Escolha outra clínica ou categoria.'})}</div>`}
function weeklyVal(its,weeks=13){const cu=new Map(its.map(i=>[i.id,custoU(i)]));const out=[];
  for(let w=weeks-1;w>=0;w--){const a=addDays(-7*(w+1)+1),b=addDays(-7*w+1);let v=0;
    for(const m of S.moves){if(!cu.has(m.item)||m.estornado)continue;const d=new Date(m.ts);if(d<a||d>=b)continue;if(m.tipo==='consumo'||m.tipo==='devolucao')v-=m.qtd*cu.get(m.item)}
    out.push({l:`${pad(a.getDate())}/${pad(a.getMonth()+1)}`,v:Math.max(0,Math.round(v))})}
  return out}
function vPainelOrc(){
  const sup=scope().length>1,its=scopeItems();
  const kp=(ic,c,n,l)=>`<div class="card kpi">${seal(ic,c)}<div><b>${n}</b><small>${l}</small></div></div>`;
  const tot=(list,cl)=>{const ex=expiring(list);return{est:list.reduce((s,i)=>s+valorSaldo(i),0),av:ex.filter(x=>x.d>=0).reduce((s,x)=>s+lotValor(x),0),vc:ex.filter(x=>x.d<0).reduce((s,x)=>s+lotValor(x),0),perd:movValor(['vencimento','descarte'],30,cl)}};
  const T=tot(its,scope());
  let h=pageHead(sup?'Painel da rede':'Painel orçamentário','');
  h+=`<div class="grid g4">${kp('box','',brl(T.est),'valor em estoque')}${kp('clock','am',brl(T.av),'em lotes a vencer')}${kp('x','gr',brl(T.vc),'em lotes vencidos')}${kp('trash','re',brl(T.perd),'perdidos nos últimos 30 dias*')}</div>
  <p class="small muted" style="margin:8px 0 0">* Perda por validade e descarte por avaria.</p>`;
  if(sup)h+=`<div class="card mt"><div class="chd"><h2>Valor por clínica</h2></div>${table(['Clínica','Valor em estoque','Em lotes a vencer','Em lotes vencidos','Perdido em 30 dias','Ver'],scope().map(id=>{const c=S.clinics.find(x=>x.id===id),t=tot(S.items.filter(i=>i.clinic===id&&i.ativo),[id]);
    return `<tr><td><b>${esc(c.nome)}</b><small>${esc(c.resp)}</small></td><td class="num"><b>${brl(t.est)}</b></td><td class="num">${brl(t.av)}</td><td class="num">${brl(t.vc)}</td><td class="num">${brl(t.perd)}</td><td class="act"><button class="btn sm sec" data-act="setclinic" data-c="${c.id}">Abrir</button></td></tr>`}))}</div>`;
  const top=its.map(i=>({i,v:valorSaldo(i)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,6);
  const cats={};its.forEach(i=>{cats[i.cat]=(cats[i.cat]||0)+valorSaldo(i)});
  const cr=Object.entries(cats).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6);const mx=Math.max(...cr.map(x=>x[1]),1);
  h+=`<div class="grid g2 w mt"><div class="card"><div class="chd"><h2>Maiores valores em estoque</h2></div>${table(['Item',...(sup?['Clínica']:[]),'Custo unitário','Valor'],top.map(({i,v})=>`<tr><td><b>${esc(i.nome)}</b><small>${esc(i.cod)}</small></td>${sup?`<td>${esc(clinicName(i.clinic))}</td>`:''}<td class="num">${brl(custoU(i))}</td><td class="num"><b>${brl(v)}</b></td></tr>`),'Sem valores: informe o custo unitário dos insumos em Cadastros.')}</div>
  <div class="card"><div class="chd"><h2>Valor em estoque por categoria</h2></div>${hbars(cr.map(([l,v])=>({l,v,t:brl(v)})),mx)||emptyState({icon:'chart',title:'Sem valores no estoque'})}</div></div>`;
  const fcl=sup?dv('po.clinic'):'',fcat=dv('po.cat'),sem=+dv('po.sem',13);
  let pool=fcl?its.filter(i=>i.clinic===fcl):its;if(fcat)pool=pool.filter(i=>i.cat===fcat);
  const codes=[...new Map(pool.map(i=>[i.cod,i])).values()].sort((x,y)=>x.nome.localeCompare(y.nome));
  const fcod=codes.some(i=>i.cod===dv('po.cod'))?dv('po.cod'):'';if(fcod)pool=pool.filter(i=>i.cod===fcod);
  const wk=weeklyVal(pool,sem),totW=wk.reduce((s,d)=>s+d.v,0);
  h+=`<div class="card mt"><div class="chd"><h2>Consumo semanal (R$)</h2></div>
   <div class="filters noprint" style="margin-bottom:8px">${sup?`<label class="f"><span>Clínica</span><select data-d="po.clinic" data-r="1">${selOpts(S.clinics.map(c=>[c.id,c.nome]),fcl,'Toda a rede')}</select></label>`:''}
   <label class="f"><span>Categoria</span><select data-d="po.cat" data-r="1">${selOpts(scopeCats(),fcat,'Todas')}</select></label>
   <label class="f"><span>Insumo</span><select data-d="po.cod" data-r="1">${selOpts(codes.map(i=>[i.cod,`${i.cod} · ${i.nome}`]),fcod,'Todos')}</select></label>
   <label class="f"><span>Período</span><select data-d="po.sem" data-r="1">${selOpts([[8,'Últimas 8 semanas'],[13,'Últimas 13 semanas'],[26,'Últimas 26 semanas']],sem)}</select></label></div>
   <p class="small" style="margin:0 0 6px"><b>Total no período:</b> ${brl(totW)}</p>${barChart(wk,{unit:'R$'})}</div>`;
  return h}
function vPainel(){
  if(budget())return vPainelOrc();
  const u=me(),role=u.perfil,its=scopeItems(),sup=isSuper()&&scope().length>1;
  const crit=its.filter(i=>['critico','zerado'].includes(st(i)));
  const ex=expiring(its),aven=ex.filter(x=>x.d>=0),venc=ex.filter(x=>x.d<0);
  const kp=(ic,c,n,l)=>`<div class="card kpi">${seal(ic,c)}<div><b>${n}</b><small>${l}</small></div></div>`;
  let h=pageHead(sup?'Painel da rede':'Painel de controle','');
  h+=`<div class="grid g4">${kp('box','',its.length,'itens controlados')}${kp('alert','re',crit.length,'itens em nível crítico')}${kp('clock','am',new Set(aven.map(x=>x.it.id)).size,'itens a vencer')}${kp('x','gr',new Set(venc.map(x=>x.it.id)).size,'itens com lote vencido')}</div>`;
  if(sup){
    h+=`<div class="card mt"><div class="chd"><h2>Situação por clínica</h2></div>${table(['Clínica','Itens','Em nível crítico','Itens a vencer','Itens vencidos','Ver'],S.clinics.map(c=>{const ci=S.items.filter(i=>i.clinic===c.id&&i.ativo),cr=ci.filter(i=>['critico','zerado'].includes(st(i))).length,e2=expiring(ci),a2=new Set(e2.filter(x=>x.d>=0).map(x=>x.it.id)).size,v2=new Set(e2.filter(x=>x.d<0).map(x=>x.it.id)).size;
      return `<tr><td><b>${esc(c.nome)}</b><small>${esc(c.resp)}</small></td><td class="num">${ci.length}</td><td class="num">${cr?pill('critico',cr+' item(ns)'):pill('ok','Nenhum')}</td><td class="num">${a2?pill('avencer',a2+' item(ns)').replace('<span class="pill">',`<button type="button" class="pill pbtn" data-act="goto-est" data-c="${c.id}" data-st="avencer" title="Ver no estoque os itens a vencer de ${esc(c.nome)}">`).replace('</span>','</button>'):pill('ok','Nenhum')}</td><td class="num">${v2?pill('vencido',v2+' item(ns)'):pill('ok','Nenhum')}</td><td class="act"><button class="btn sm sec" data-act="setclinic" data-c="${c.id}">Abrir</button></td></tr>`}))}</div>`;
  }
  h+=`<div class="grid g2 w mt"><div class="card"><div class="chd"><h2>Itens em nível crítico</h2>${pill(crit.length?'critico':'ok',crit.length?crit.length+' item(ns)':'Tudo em ordem')}</div>
   ${table(['Item',...(sup?['Clínica']:[]),'Saldo','Nível crítico','Cobertura','Status'],crit.slice(0,8).map(i=>{const cb=cobertura(i);return `<tr><td><b>${esc(i.nome)}</b><small>${esc(i.cod)}</small></td>${sup?`<td>${esc(clinicName(i.clinic))}</td>`:''}<td class="num">${num(saldoUtil(i.id))} ${i.un}</td><td class="num">${nivelTag(nivelCritico(i))}</td><td class="num">${cb==null?'—':num(cb)+' d'}</td><td>${pill(st(i))}</td></tr>`}),'Nenhum item em nível crítico.')}
   </div>
  <div class="card"><div class="chd"><h2>Validades próximas</h2>${pill(ex.length?(venc.length?'vencido':'avencer'):'ok',ex.length?`${aven.length} a vencer · ${venc.length} vencido(s)`:'Nenhum lote')}</div>
   ${table(['Item','Lote','Qtd','Validade','Situação'],ex.slice(0,8).map(x=>`<tr><td><b>${esc(x.it.nome)}</b><small>${esc(x.it.cod)}${sup?' · '+esc(clinicName(x.it.clinic)):''}</small></td><td>${esc(x.l.lote)}</td><td class="num">${num(x.l.qtd)}</td><td class="nowrap">${valTag(x.l.val,x.it)}</td><td>${x.d<0?pill('vencido'):pill('avencer')}</td></tr>`),'Nenhum lote vencido ou a vencer dentro da antecedência de alerta.')}${venc.length&&can('saida')?`<div style="margin-top:10px"><button class="btn sec sm" data-act="descartar-venc">${ico('trash',16)}Descartar lotes vencidos</button></div>`:''}</div></div>`;
  if(['admin','superuser','controlador'].includes(role)){
    h+=`<div class="grid g21 w mt">${chartCard()}
    <div class="card"><div class="chd"><h2>Últimas movimentações</h2><button class="btn sm ghost" data-act="go" data-p="mov">ver todas</button></div>
     ${S.moves.filter(m=>scope().includes(m.clinic)).sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,4).map(m=>{const it=itemById(m.item);return `<div class="nt"><div class="b"><b>${esc(it?it.nome:'—')}</b><div class="small">${pill(m.tipo)} <span class="nowrap">${m.qtd>0?'+':''}${num(m.qtd)} ${it?it.un:''}</span></div><div class="small muted">${fDT(m.ts)} · ${esc(userName(m.user))}</div></div></div>`}).join('')}</div></div>`}
  return h}

/* =====================================================================
   ESTOQUE
   ===================================================================== */
const nivelTxt=n=>`Nível crítico ${n} de 10 (0 = tranquilo, 10 = muito crítico)`;
const nivelTag=n=>`<span class="nvl ${n>=7?'nvl-hi':n>=5?'nvl-mid':'nvl-lo'}" tabindex="0" role="img" aria-label="${nivelTxt(n)}" data-tip="${nivelTxt(n)}">${n}<small>/10</small></span>`;
function nvHelp(){const m=S.cfg.margem;
  modal('Como ler o nível crítico',`<p>O nível crítico é uma nota de <b>0 a 10</b> que mostra o quanto um insumo está perto de faltar.</p>
  <div class="scale" role="list"><div role="listitem">${pill('ok','0 a 4 · Adequado')}</div><div role="listitem">${pill('repor','5 e 6 · Repor em breve')}</div><div role="listitem">${pill('critico','7 a 10 · Nível crítico alto')}</div></div>
  <h3 style="margin:16px 0 6px">Como a nota é calculada</h3>
  <ol class="how"><li><b>Consumo diário:</b> a média de retirada do insumo, aprendida do histórico.</li><li><b>Cobertura:</b> quantos dias o saldo utilizável dura nesse ritmo (saldo ÷ consumo diário).</li><li><b>Meta:</b> o tempo médio de reposição do insumo mais uma margem de ${m}%.</li><li><b>Nota:</b> quanto menor a cobertura em relação à meta, maior a nota. Sem saldo utilizável a nota é 10.</li></ol>
  <p class="small muted">Cobertura igual à meta dá nota 7; cobertura de 3 vezes a meta ou mais dá nota 0. Lotes vencidos não entram no saldo utilizável. A margem é ajustada em Configurações.</p>
  <div class="mf"><button class="btn" data-act="mclose">Entendi</button></div>`)}
const vtag=(p,it)=>p?`${valTag(p.l.val,it)} <span class="small muted nowrap">${p.d===0?'vence hoje':'em '+p.d+' dia'+(p.d>1?'s':'')}</span>`:'—';
const EST_RANK={zerado:0,critico:0,repor:1,ok:2};
const EST_SORTS={nome:i=>i.nome.toLowerCase(),cod:i=>i.cod,clinic:i=>clinicName(i.clinic),saldo:i=>saldoUtil(i.id),val:i=>{const p=proxVal(i);return p?p.d:null},nivel:i=>nivelCritico(i),cob:i=>cobertura(i),st:i=>EST_RANK[st(i)]*11-nivelCritico(i)};
const estSort=()=>({k:dv('est.sort','st'),dir:dv('est.dir','asc')});
const estFilters=()=>({q:(dv('est.q')||'').toLowerCase(),cat:dv('est.cat'),st:dv('est.st'),val:dv('est.val'),lote:dv('est.lote'),temp:dv('est.temp'),cob:dv('est.cob')});
function estMatch(i,f){
  if(f.q&&!(i.nome+' '+i.cod).toLowerCase().includes(f.q))return false;
  if(f.cat&&i.cat!==f.cat)return false;
  if(f.st){const s=st(i);if(f.st==='alerta'){if(s==='ok')return false}else if(f.st==='queda'){if(!consumoAprendido(i).baixo)return false}else if(f.st!==s)return false}
  if(f.val){if(f.val==='vencido'){if(!itemLots(i.id).some(l=>l.val&&dayDiff(l.val)<0))return false}
    else if(f.val==='avencer'){if(!expiring([i]).some(x=>x.d>=0))return false}
    else{const pv=proxVal(i);if(!pv||pv.d>+f.val)return false}}
  if(f.lote==='sim'&&!i.lote)return false;if(f.lote==='nao'&&i.lote)return false;
  if(f.temp){if(f.temp==='reg'){if(!i.regTemp)return false}else if(i.temp!==f.temp)return false}
  if(f.cob!==''&&f.cob!=null){const c=cobertura(i);if(c==null||c>+f.cob)return false}
  return true}
const ESTO_SORTS={nome:i=>i.nome.toLowerCase(),clinic:i=>clinicName(i.clinic),custo:i=>custoU(i)||null,valor:i=>valorSaldo(i),risco:i=>expiring([i]).reduce((s,x)=>s+lotValor(x),0)};
function vEstoqueOrc(){
  const sup=scope().length>1;const q=(dv('est.q')||'').toLowerCase(),cat=dv('est.cat');
  let sort=estSort();if(!ESTO_SORTS[sort.k])sort={k:'valor',dir:'desc'};
  const its=scopeItems().filter(i=>(!q||(i.nome+' '+i.cod).toLowerCase().includes(q))&&(!cat||i.cat===cat));
  const key=ESTO_SORTS[sort.k],dirm=sort.dir==='desc'?-1:1;
  its.sort((a,b)=>{const va=key(a),vb=key(b);
    if(va==null&&vb==null)return a.nome.localeCompare(b.nome);if(va==null)return 1;if(vb==null)return -1;
    const c=typeof va==='string'?va.localeCompare(vb):va-vb;return c?c*dirm:a.nome.localeCompare(b.nome)});
  const sh=(label,k,cls)=>{const on=sort.k===k;return [`<button type="button" class="thsort" data-act="est-sort" data-k="${k}" title="Ordenar por ${label.toLowerCase()}">${label}${on?(sort.dir==='asc'?' ▲':' ▼'):' <span style="opacity:.55">↕</span>'}</button>`,cls||'',on?(sort.dir==='asc'?'ascending':'descending'):'none']};
  const tv=its.reduce((s,i)=>s+valorSaldo(i),0),rk=its.reduce((s,i)=>s+ESTO_SORTS.risco(i),0);
  let h=pageHead('Valor do estoque','');
  h+=`<div class="filters one noprint" role="search" aria-label="Filtros do estoque"><input class="fc grow" id="est-q" type="search" placeholder="Buscar por nome ou código" aria-label="Buscar por nome ou código" value="${esc(dv('est.q'))}" data-d="est.q" data-r="live">
   <select class="fc" data-d="est.cat" data-r="1" aria-label="Filtrar por categoria" title="Filtrar por categoria">${selOpts(scopeCats(),cat,'Categoria')}</select>
   <button type="button" class="btn ghost sm" data-act="est-clear" ${q||cat?'':'disabled'} title="Limpar filtros" aria-label="Limpar filtros">${ico('x',16)}Limpar</button></div>
   <p class="small" style="margin:0 0 8px"><b>Valor em estoque nesta lista:</b> ${brl(tv)} &nbsp;·&nbsp; <b>Em lotes vencidos ou a vencer:</b> ${brl(rk)}</p>`;
  h+=`<p class="count" role="status">Exibindo <b>${its.length}</b> de <b>${scopeItems().length}</b> insumos</p>`;
  h+=table([sh('Insumo','nome'),...(sup?[sh('Clínica','clinic')]:[]),sh('Custo unitário','custo','num'),sh('Valor em estoque','valor','num'),sh('Em lotes vencidos ou a vencer','risco','num')],its.map(i=>{const r=ESTO_SORTS.risco(i);
    return `<tr><td><b>${esc(i.nome)}</b><small>${esc(i.cod)} · ${esc(i.cat)}</small></td>${sup?`<td>${esc(clinicName(i.clinic))}</td>`:''}<td class="num">${custoU(i)?brl(custoU(i)):'<span class="muted small">sem custo</span>'}</td><td class="num"><b>${brl(valorSaldo(i))}</b></td><td class="num">${r?brl(r):'—'}</td></tr>`}),q||cat?'Nenhum insumo atende a esses filtros.':'Nenhum insumo cadastrado.');
  return h}
function vEstoque(){
  if(budget())return vEstoqueOrc();
  const sup=scope().length>1;const f=estFilters(),sort=estSort();
  const all=scopeItems();let its=all.filter(i=>estMatch(i,f));
  const key=EST_SORTS[sort.k]||EST_SORTS.st,dirm=sort.dir==='desc'?-1:1;
  its.sort((a,b)=>{const va=key(a),vb=key(b);
    if(va==null&&vb==null)return a.nome.localeCompare(b.nome);if(va==null)return 1;if(vb==null)return -1; // vazios sempre ao final
    const c=typeof va==='string'?va.localeCompare(vb):va-vb;return c?c*dirm:a.nome.localeCompare(b.nome)});
  const sh=(label,k,cls)=>{const on=sort.k===k;return [`<button type="button" class="thsort" data-act="est-sort" data-k="${k}" title="Ordenar por ${label.toLowerCase()}">${label}${on?(sort.dir==='asc'?' ▲':' ▼'):' <span style="opacity:.55">↕</span>'}</button>`,cls||'',on?(sort.dir==='asc'?'ascending':'descending'):'none']};
  const active=['q','cat','st','val','lote','temp'].some(k=>f[k])||(f.cob!==''&&f.cob!=null);
  let h=pageHead('Estoque','',
    can('saida')?`<button class="btn sec" data-act="descartar-venc">${ico('trash',18)}Descartar lotes vencidos</button>`:'');
  const sel=(path,aria,opts,cur,ph)=>`<select class="fc" data-d="${path}" data-r="1" aria-label="${aria}" title="${aria}">${selOpts(opts,cur,ph)}</select>`;
  h+=`<div class="filters one noprint" role="search" aria-label="Filtros do estoque"><input class="fc grow" id="est-q" type="search" placeholder="Buscar por nome ou código" aria-label="Buscar por nome ou código" value="${esc(dv('est.q'))}" data-d="est.q" data-r="live">
   ${sel('est.cat','Filtrar por categoria',scopeCats(),f.cat,'Categoria')}
   ${sel('est.st','Filtrar por situação',[['alerta','Requer atenção'],['critico','Nível crítico'],['zerado','Sem estoque'],['repor','Repor em breve'],['queda','Consumo em queda'],['ok','Adequado']],f.st,'Situação')}
   ${sel('est.val','Filtrar por validade',[['vencido','Com lote vencido'],['avencer','A vencer (dentro do alerta)'],['30','Vence em até 30 dias'],['60','Vence em até 60 dias'],['90','Vence em até 90 dias']],f.val,'Validade')}
   ${sel('est.lote','Filtrar por controle de lote',[['sim','Com controle de lote'],['nao','Sem controle de lote']],f.lote,'Lote')}
   ${sel('est.temp','Filtrar por temperatura',[['reg','Registra temperatura'],...Object.entries(TEMPS)],f.temp,'Temperatura')}
   <input class="fc narrow" id="est-cob" type="number" min="0" step="1" placeholder="Cobertura ≤ dias" aria-label="Cobertura em dias, no máximo" title="Cobertura em dias, no máximo" value="${esc(dv('est.cob'))}" data-d="est.cob" data-r="live">
   <button type="button" class="btn ghost sm" data-act="est-clear" ${active?'':'disabled'} title="Limpar filtros" aria-label="Limpar filtros">${ico('x',16)}Limpar</button><button type="button" class="btn ghost sm" data-act="nv-help">${ico('info',16)}Como ler o nível crítico</button></div>`;
  h+=`<p class="count" role="status">Exibindo <b>${its.length}</b> de <b>${scopeItems().length}</b> insumos</p>`;
  h+=table([sh('Insumo','nome'),...(sup?[sh('Clínica','clinic')]:[]),sh('Saldo','saldo','num'),sh('Validade mais próxima','val'),sh('Nível crítico','nivel','num'),sh('Cobertura','cob','num'),sh('Situação','st'),'Lotes'],its.map(i=>{
    const s=saldo(i.id),su=saldoUtil(i.id),cb=cobertura(i),pv=proxVal(i),nv=itemLots(i.id).filter(isExp).length,low=consumoAprendido(i).baixo;
    return `<tr><td><b>${esc(i.nome)}</b><small>${esc(i.cod)} · ${esc(i.cat)}${i.regTemp&&i.temp?` · ${ico('temp',13)} ${esc(TEMPS[i.temp])}`:''}</small></td>${sup?`<td>${esc(clinicName(i.clinic))}</td>`:''}
     <td class="num"><b>${num(s)}</b> ${i.un}${s!==su?`<small>${num(su)} utilizáveis</small>`:''}</td>
     <td class="sm1">${i.lote?vtag(pv,i):'<span class="muted small">sem controle de validade</span>'}${nv?`<span class="warn ${pv?valCls(pv.l.val,i.antec):'x'}" tabindex="0" role="img" data-tip="${nv} lote${nv>1?'s':''} vencido${nv>1?'s':''}" aria-label="${nv} lote${nv>1?'s':''} vencido${nv>1?'s':''}">${ico('alert',16)}</span>`:''}</td>
     <td class="num">${nivelTag(nivelCritico(i))}</td><td class="num">${cb==null?'—':num(cb)+' d'}</td><td>${pill(st(i))}${low?`<small>${ico('chart',12)} consumo em queda</small>`:''}</td>
     <td class="act"><button class="btn sm sec" data-act="lotes" data-id="${i.id}">${i.lote?'Lotes':'Detalhe'}</button></td></tr>`}),active?emptyState({icon:'search',title:'Nenhum insumo atende aos filtros',desc:'Ajuste ou limpe os filtros para ver os demais insumos.',action:`<button type="button" class="btn sec sm" data-act="est-clear">${ico('x',14)}Limpar filtros</button>`}):emptyState({icon:'box',title:'Nenhum insumo cadastrado',desc:can('cad_insumos')?'Cadastre o primeiro insumo em Cadastros.':'Peça ao Administrador para cadastrar os insumos.',action:can('cad_insumos')?`<button type="button" class="btn sm" data-act="go" data-p="cad">${ico('plus',14)}Ir para Cadastros</button>`:''}));
  return h}
function lotesModal(id){
  const it=itemById(id);const lots=itemLots(id);const ca=consumoAprendido(it),lt=leadTime(it);
  modal(`${it.nome}`,`<p class="muted small" style="margin-bottom:10px">${esc(clinicName(it.clinic))} · ${esc(it.cod)} · ${it.lote?`controle por lote e validade (alerta ${it.antec} dias antes)`:'sem controle de lote'}${it.regTemp&&it.temp?` · armazenar: ${esc(TEMPS[it.temp])}`:''}</p>
   ${table(['Ordem de saída','Lote','Validade','Qtd','Situação',''],lots.map((l,i)=>{const d=l.val?dayDiff(l.val):null;const first=!isExp(l)&&l===usable(id)[0];return `<tr class="${first?'firstrow':''}"><td>${isExp(l)?'—':(usable(id).indexOf(l)+1)+'º'}${first?'<small><b>usar primeiro</b></small>':''}</td><td>${esc(l.lote)}</td><td class="nowrap">${valTag(l.val,it)}</td><td class="num">${num(l.qtd)} ${it.un}</td><td>${d===null?pill('valido','Sem validade'):d<0?pill('vencido','Vencido'):d<=it.antec?pill('avencer',`A vencer em ${d} d`):pill('valido')}</td><td class="act">${can('inventario')?`<button class="btn sm sec" data-act="ajustar" data-id="${l.id}">${ico('edit',14)}Ajustar contagem</button>`:''}</td></tr>`}),'Sem lotes com saldo.')}
   <div class="grid g3 mt" style="gap:10px"><div class="callout"><b>Consumo médio (30 dias)</b><br>${num(consumoDia(it))} ${it.un}/dia</div><div class="callout"><b>Aprendido (dias 15–90 × últimos 14)</b><br>${num(ca.base)} → ${num(ca.rec)} ${it.un}/dia ${ca.baixo?pill('consumo','em queda'):''}</div><div class="callout"><b>Tempo de reposição</b><br>${num(lt.dias)} dias ${lt.n?`(média de ${lt.n} entrada${lt.n>1?'s':''})`:'(estimado)'}</div></div>
   <p class="small muted" style="margin-top:10px">Saídas sugerem sempre o lote de validade mais próxima. Lotes vencidos ficam bloqueados para consumo.</p>`,true)}
function ajustarModal(lotId){
  const l=S.lots.find(x=>x.id===lotId),it=itemById(l.item);
  formModal(`Ajuste de inventário — lote ${l.lote}`,[
    {k:'novo',l:`Quantidade contada (${it.un})`,t:'number',req:1,min:0,def:l.qtd,h:`Saldo no sistema: ${num(l.qtd)}`},
    {k:'just',l:'Justificativa (obrigatória)',t:'textarea',req:1,full:1,h:'Ex.: contagem física de outubro; quebra de embalagem; erro de lançamento anterior.'}],null,v=>{
    if(!v.just||v.just.trim().length<5)return 'Informe uma justificativa com pelo menos 5 caracteres.';
    if(v.novo==null||v.novo<0)return 'Informe a quantidade contada.';
    const diff=v.novo-l.qtd;if(diff===0)return 'A contagem é igual ao saldo do sistema — nenhum ajuste necessário.';
    l.qtd=v.novo;mv({item:it.id,clinic:it.clinic,lot:l.id,loteTxt:l.lote,qtd:diff,tipo:'ajuste',motivo:v.just.trim(),origem:'inventário'});
    aud('Ajuste','Inventário',`${it.nome} · lote ${l.lote}: ${num(l.qtd-diff)} → ${num(l.qtd)} (${v.just.trim()})`,it.clinic);
    commit('Inventário ajustado e registrado no log.');return null},{submit:'Confirmar ajuste'})}

/* =====================================================================
   SAÍDAS (consumo, procedimento padrão, descarte, empréstimo, doação, devolução)
   ===================================================================== */
const OUT_TIPOS=['consumo','vencimento','descarte','emprestimo','doacao'];
function canUndo(m){if(m.estornado||!OUT_TIPOS.includes(m.tipo))return false;if(can('estorno'))return true;return m.user===S.session&&can('saida')&&Date.now()-new Date(m.ts)<864e5}
function vSaida(){
  if(!can('saida'))return noPerm();
  const t=tabOf('saida','manual');
  let h=pageHead('Saídas de estoque','');
  h+=tabsHtml('saida',[['manual','Retirada'],['proc','Pacote de insumos']],'manual');
  h+=`<div style="max-width:860px">${t==='proc'?saidaProc():saidaManual()}</div>`;
  return h}
function saidaManual(){
  const its=myItems();const cod=dv('sm.cod');const it=findByCode(cod,its);const tipo=dv('sm.tipo','consumo');
  const tipos=OUT_TIPOS.filter(k=>k==='consumo'||can('saida'));
  const lots=it?(tipo==='vencimento'?itemLots(it.id).filter(isExp):usable(it.id)):[];const sug=lots[0];
  const sel=dv('sm.lot','');const other=!!(sel&&sug&&sel!==sug.id&&lots.length>1);
  const qty=+dv('sm.qty')||0;const ba=it&&qty>0&&tipo!=='vencimento'?baixaAlta(it,qty):null;
  const needDest=['emprestimo','doacao'].includes(tipo);
  return `<form class="card" data-form="saida-manual"><h2>Retirada de insumo</h2><div class="fg">
   <label class="f full"><span>Código do insumo<b class="rq" aria-hidden="true"> *</b></span>${codeField('sm-cod','sm.cod',its)}<small>Digite o código ou escolha na lista.</small></label>
   ${it?itemCard(it):notFound(cod.trim())}
   ${it&&sug?`<div class="callout w full" style="grid-column:1/-1"><b>Lote sugerido (validade mais próxima):</b> <b>${esc(sug.lote)}</b> · validade ${valTag(sug.val,it)}${sug.val?` (${dayDiff(sug.val)} dia${dayDiff(sug.val)===1?'':'s'})`:''} · ${num(sug.qtd)} ${esc(it.un)}</div>`:''}
   ${lots.length>1?`<label class="f full"><span>Lote</span><select data-d="sm.lot" data-r="1">${selOpts(lots.map((l,i)=>[l.id,`${i===0?'★ ':''}${l.lote} · validade ${fD(l.val)} · ${num(l.qtd)} ${it.un}${i===0?' — sugerido':''}`]),sel||lots[0].id)}</select><small>Você pode escolher outro lote, mas o Administrador da clínica será avisado.</small></label>`:''}
   ${other?`<div class="callout e full" style="grid-column:1/-1"><b>Atenção:</b> este lote não é o de validade mais próxima (${esc(sug.lote)}, validade ${fD(sug.val)}). Ao confirmar, o Administrador será notificado.</div>`:''}
   <label class="f"><span>Quantidade ${it?`(${it.un})`:''}<b class="rq" aria-hidden="true"> *</b></span><input type="number" min="0" step="any" required value="${esc(dv('sm.qty'))}" data-d="sm.qty" data-r="1"></label>
   <label class="f"><span>Tipo de saída<b class="rq" aria-hidden="true"> *</b></span><select data-d="sm.tipo" data-r="1">${selOpts(tipos.map(k=>[k,TIPO_SAIDA_USER[k]]),tipo)}</select></label>
   ${ba?`<div class="callout w full" style="grid-column:1/-1"><b>Retirada acima do padrão:</b> ${num(qty)} ${esc(it.un)} é ${num(ba.ratio)}× a média diária (${num(ba.cd)}/dia). O Administrador será avisado ao confirmar.</div>`:''}
   ${needDest?`<label class="f full"><span>${tipo==='doacao'?'Entidade ou pessoa que recebe a doação':'Quem recebe o empréstimo (unidade ou pessoa)'}<b class="rq" aria-hidden="true"> *</b></span><input type="text" required value="${esc(dv('sm.dest'))}" data-d="sm.dest"></label>`:''}
   <label class="f full"><span>Motivo ${tipo==='consumo'?'(opcional)':'*'}</span><input type="text" ${tipo==='consumo'?'':'required'} placeholder="${tipo==='consumo'?'Ex.: atendimento, aula prática':tipo==='descarte'?'Descreva a avaria':'Descreva o motivo'}" value="${esc(dv('sm.motivo'))}" data-d="sm.motivo"></label></div>
   <div class="err hide" role="alert"></div><div class="mf"><button class="btn" type="submit">${ico('check',18)}Registrar saída</button></div></form>`}
const myPk=()=>S.packages.filter(p=>p.ativo&&p.clinic===me().clinic);
function saidaProc(){
  const pk=myPk();const pid=dv('sp.pkg'),p=pk.find(x=>x.id===pid),mult=+dv('sp.mult',1)||1;
  let rows='',ajustado=false;
  if(p){rows=table(['Insumo','Padrão','Qtd a baixar','Saldo',''],p.itens.map(r=>{const it=itemById(r.item);const def=Math.round(r.qtd*mult*100)/100;const cur=dv('sp.q.'+r.item,def);const diff=+cur!==def;if(diff)ajustado=true;
     return `<tr><td><b>${esc(it.nome)}</b><small>${esc(it.cod)}</small></td><td class="num">${num(def)} ${it.un}</td><td class="num" style="width:130px"><input type="number" min="0" step="any" data-d="sp.q.${r.item}" data-r="1" value="${esc(cur)}" aria-label="Quantidade de ${esc(it.nome)}"></td><td class="num">${num(saldoUtil(it.id))}</td><td>${diff?pill('avencer','Ajustado'):''}</td></tr>`}))}
  return `<form class="card" data-form="saida-proc"><h2>Baixa de pacote de insumos</h2><div class="fg">
   <label class="f"><span>Pacote<b class="rq" aria-hidden="true"> *</b></span><select name="pkg" required data-d="sp.pkg" data-r="1" data-clear="sp.q">${selOpts(pk.map(x=>[x.id,x.nome]),pid,'Selecione…')}</select></label>
   <label class="f"><span>Quantidade de pacotes</span><input type="number" min="1" step="1" name="mult" value="${esc(dv('sp.mult',1))}" data-d="sp.mult" data-r="1" data-clear="sp.q"></label></div>
   ${p?`<div style="margin-top:14px">${rows}</div>
   ${ajustado?`<label class="f" style="margin-top:12px"><span>Justificativa do ajuste<b class="rq" aria-hidden="true"> *</b></span><textarea name="just" required data-d="sp.just" placeholder="Por que as quantidades diferem do padrão?">${esc(dv('sp.just'))}</textarea></label>`:'<p class="small muted" style="margin-top:8px">Altere uma quantidade se o consumo real for diferente do padrão — será exigida justificativa. Os lotes saem na ordem de validade mais próxima.</p>'}`:'<p class="muted" style="margin-top:12px">Escolha o pacote para ver os insumos que o compõem.</p>'}
   <div class="err hide" role="alert"></div><div class="mf"><button class="btn" type="submit" ${p?'':'disabled'}>${ico('check',18)}Confirmar baixa</button></div></form>`}
function vDevolucao(){
  if(!can('saida'))return noPerm();
  return pageHead('Devolução','')+`<div style="max-width:860px">${saidaDev()}</div>`}
function saidaDev(){
  const its=myItems();const cod=dv('dv.cod');const it=findByCode(cod,its);
  const lots=it?S.lots.filter(l=>l.item===it.id).sort(fefo):[];const ls=dv('dv.lot','');const novo=ls==='__new'||(it&&!lots.length);
  const lotObj=!novo&&ls?lots.find(l=>l.id===ls):null;
  const pessoas=S.users.filter(x=>x.clinic===me().clinic&&x.ativo);
  const qty=+dv('dv.qty')||0;const pes=dv('dv.pessoa');
  const lote=novo?(dv('dv.lote')||'—'):lotObj?lotObj.lote:'—',val=novo?dv('dv.val'):lotObj?lotObj.val:'';
  return `<form class="card" data-form="saida-dev"><h2>Devolução de item retirado e não utilizado</h2><p class="muted small" style="margin-bottom:10px">O item volta a ser cadastrado no estoque, no mesmo lote ou em um lote novo.</p><div class="fg">
   <label class="f full"><span>Código do insumo<b class="rq" aria-hidden="true"> *</b></span>${codeField('dv-cod','dv.cod',its)}</label>
   ${it?itemCard(it):notFound(cod.trim())}
   <label class="f"><span>Quantidade devolvida ${it?`(${it.un})`:''}<b class="rq" aria-hidden="true"> *</b></span><input type="number" min="0" step="any" required value="${esc(dv('dv.qty'))}" data-d="dv.qty" data-r="1"></label>
   <label class="f"><span>Pessoa que retirou e devolveu<b class="rq" aria-hidden="true"> *</b></span><input type="text" required autocomplete="off" list="dl-pes" placeholder="Nome de quem retirou e devolveu" value="${esc(pes)}" data-d="dv.pessoa" data-r="1"><datalist id="dl-pes">${pessoas.map(x=>`<option value="${esc(x.nome)}"></option>`).join('')}</datalist></label>
   ${it?`<label class="f full"><span>Lote<b class="rq" aria-hidden="true"> *</b></span><select data-d="dv.lot" data-r="1" required>${selOpts([...lots.map(l=>[l.id,`${l.lote} · validade ${fD(l.val)} · saldo ${num(l.qtd)}`]),['__new','Outro lote (informar abaixo)']],novo?'__new':ls,'Selecione…')}</select></label>
   ${novo&&it.lote?`<label class="f"><span>Lote<b class="rq" aria-hidden="true"> *</b></span><input type="text" required value="${esc(dv('dv.lote'))}" data-d="dv.lote"></label><label class="f"><span>Validade<b class="rq" aria-hidden="true"> *</b></span><input type="date" required value="${esc(dv('dv.val'))}" data-d="dv.val" data-r="1"></label>`:''}`:''}
   <label class="f full"><span>Observação (opcional)</span><input type="text" value="${esc(dv('dv.obs'))}" data-d="dv.obs" placeholder="Ex.: caixa lacrada, não abriu"></label></div>
   ${it&&qty>0&&pes?`<div class="callout i" style="margin-top:12px"><b>Resumo da devolução</b><br>Código: ${esc(it.cod)} · Quantidade devolvida: ${num(qty)} ${esc(it.un)}<br>Lote: ${esc(lote)} · Validade: ${fD(val)}<br>Retirado e devolvido por: ${esc(pes)}</div>`:''}
   <div class="err hide" role="alert"></div><div class="mf"><button class="btn" type="submit">${ico('undo',18)}Registrar devolução</button></div></form>`}
function estornarModal(id){
  const m=S.moves.find(x=>x.id===id),it=itemById(m.item);
  formModal('Estornar saída registrada por engano',[{k:'just',l:'Motivo do estorno',t:'textarea',req:1,full:1}],null,v=>{
    if(!v.just||v.just.trim().length<3)return 'Informe o motivo do estorno.';
    const l=S.lots.find(x=>x.id===m.lot);if(l)l.qtd+=-m.qtd;m.estornado=true;
    mv({item:m.item,clinic:m.clinic,lot:m.lot,loteTxt:m.loteTxt,qtd:-m.qtd,tipo:'estorno',motivo:v.just.trim(),origem:'estorno de '+m.id,estornoDe:m.id});
    aud('Estorno','Movimentação',`${it.nome}: estorno de ${num(-m.qtd)} ${it.un} (${v.just.trim()})`,m.clinic);
    commit('Saída estornada. Ambos os lançamentos permanecem no histórico.');return null},{submit:'Estornar',extra:`<p class="small muted" style="margin-top:10px">Será criado um lançamento de estorno de ${num(-m.qtd)} ${esc(it.un)} (lote ${esc(m.loteTxt||'—')}); a saída original é mantida no histórico.</p>`})}

/* =====================================================================
   ENTRADAS (por origem), NOTAS DE RECEBIMENTO e RECEBIMENTOS INCORRETOS
   ===================================================================== */
function vEntrada(){
  if(!can('entrada')&&!budget())return noPerm();
  const edit=can('entrada');let t=tabOf('entrada',edit?'nova':'notas');if(!edit)t='notas';const cl=me().clinic;
  let h=pageHead('Entradas de estoque','');
  h+=tabsHtml('entrada',edit?[['nova','Nova entrada'],['notas','Notas de recebimento'],['ab','Recebimentos incorretos']]:[['notas','Notas de recebimento']],edit?'nova':'notas');
  if(t==='notas'){
    const rs=S.receipts.filter(r=>scope().includes(r.clinic)).sort((a,b)=>b.ts.localeCompare(a.ts));const supN=scope().length>1;
    return h+table(['Nota',...(supN?['Clínica']:[]),'Recebimento','Origem',...(budget()?['Valor total']:['Itens','Conferência','Anexos']),''],rs.map(r=>{const dvg=r.rows.some(x=>x.ped!=null&&x.rec!==x.ped);
     return `<tr class="${r.estornada?'off':''}"><td><b>${r.id}</b><small>${fDT(r.ts)}</small></td>${supN?`<td>${esc(clinicName(r.clinic))}</td>`:''}<td class="nowrap">${fD(r.recebidoEm)}</td><td>${esc(originLabel(r.origem))}</td>${budget()?`<td class="num"><b>${brl(notaValor(r))}</b>${r.estornada?'<small>estornada</small>':''}</td>`:`<td class="num">${r.rows.length}</td><td>${r.estornada?pill('estorno','Estornada'):dvg?pill('avencer','Com divergência'):pill('ok','Conferida')}</td><td class="small">${[r.carta&&'Carta: '+r.carta,r.comprovante&&'Comprovante: '+r.comprovante].filter(Boolean).map(esc).join('<br>')||'—'}</td>`}<td class="act"><button class="btn sm sec" data-act="nota" data-id="${r.id}">${ico('eye',14)}Ver nota</button> ${!r.estornada&&edit?`<button class="btn sm sec" data-act="estorno-nota" data-id="${r.id}">${ico('undo',14)}Estornar</button>`:''}</td></tr>`}),'Nenhuma nota emitida.')}
  if(t==='ab')return h+vAbandonados();
  // nova entrada
  const E=D.ent||(D.ent={origem:'central',rows:[{}],recebidoEm:ymd(T0)});const its=myItems();
  const doa=E.origem==='doacao';const peds=S.requests.filter(r=>r.clinic===cl&&!r.atendido);
  const rows=E.rows.map((r,i)=>{const it=findByCode(r.cod,its);const div=it&&E.ped&&r.rec!==undefined&&r.rec!==''&&r.ped!=null&&+r.rec!==+r.ped;
    return `<tr><td style="min-width:170px"><input id="ent-cod-${i}" type="text" list="dl-ent" autocomplete="off" placeholder="INS-0001" value="${esc(r.cod??'')}" data-d="ent.rows.${i}.cod" data-r="1" data-enter="1" aria-label="Código do insumo"></td>
     <td class="small" style="min-width:150px">${it?`<b>${esc(it.nome)}</b>`:(r.cod?'<span style="color:var(--status-danger-text)">código não encontrado</span>':'—')}</td>
     ${E.ped?`<td class="num" style="width:80px">${r.ped!=null?num(r.ped):'—'}</td>`:''}
     <td style="width:100px"><input type="number" min="0" step="any" data-d="ent.rows.${i}.rec" data-r="1" value="${esc(r.rec??'')}" aria-label="Quantidade recebida" ${div?'style="border-color:var(--status-warning-text)"':''}></td>
     <td style="width:120px"><input type="text" data-d="ent.rows.${i}.lote" value="${esc(r.lote??'')}" ${it&&!it.lote?'disabled placeholder="—"':'placeholder="Lote"'} aria-label="Lote"></td>
     <td style="width:140px"><input type="date" data-d="ent.rows.${i}.val" value="${esc(r.val??'')}" ${it&&!it.lote?'disabled':''} aria-label="Validade"></td>
     <td style="width:110px">${div?pill('avencer',`Δ ${num(r.rec-r.ped)}`):''}</td>
     <td><button type="button" class="ib" data-act="ent-del" data-i="${i}" aria-label="Remover linha">${ico('x',18)}</button></td></tr>`}).join('');
  const file=(k,label,req)=>E[k]?`<div class="f"><span>${label}${req?'<b class="rq" aria-hidden="true"> *</b>':''}</span><span class="pill">${ico('file',13)} ${esc(E[k])} <button type="button" class="ib" style="width:22px;height:22px" data-act="ent-file-clear" data-k="${k}" aria-label="Remover anexo">${ico('x',12)}</button></span></div>`:`<label class="f"><span>${label}${req?'<b class="rq" aria-hidden="true"> *</b>':''}</span><input type="file" id="ent-${k}" data-file="ent.${k}" accept=".pdf,.png,.jpg,.jpeg"></label>`;
  h+=`<form class="card" data-form="entrada"><h2 class="sh3" style="margin-bottom:8px">Origem da entrada</h2>
   <div class="seg noprint" role="group" aria-label="Origem da entrada">${Object.entries(ORIGENS).map(([k,l])=>`<button type="button" class="${E.origem===k?'on':''}" data-act="ent-origem" data-v="${k}">${l}</button>`).join('')}</div>
   <div class="fg" style="margin-top:12px">
    ${E.origem==='clinica'?`<label class="f"><span>Clínica de origem<b class="rq" aria-hidden="true"> *</b></span><select data-d="ent.clinica" required>${selOpts(S.clinics.filter(c=>c.id!==cl).map(c=>[c.id,c.nome]),E.clinica,'Selecione…')}</select><small>Apenas registro da origem. O fluxo de transferência entre clínicas é uma fase futura.</small></label>`:''}
    ${E.origem==='outro'?`<label class="f"><span>Descreva a origem<b class="rq" aria-hidden="true"> *</b></span><input type="text" required value="${esc(E.texto??'')}" data-d="ent.texto"></label>`:''}
    ${doa?`<label class="f"><span>Doador</span><input type="text" value="${esc(E.texto??'')}" data-d="ent.texto" placeholder="Nome da pessoa ou entidade"></label>${file('carta','Carta do doador',true)}`:''}
    ${file('comprovante','Comprovante (opcional)',false)}
    ${doa?'':`<label class="f"><span>Importar de requisição</span><select data-d="ent.ped" data-r="1" data-cb="entPed">${selOpts(peds.map(r=>[r.id,`${r.id} · pedido em ${fD(r.data)}`]),E.ped,'Sem requisição')}</select></label>
    <label class="f"><span>Data do pedido</span><input type="date" value="${esc(E.pedidoEm??'')}" data-d="ent.pedidoEm" ${E.ped?'readonly':''} max="${ymd(T0)}"><small>Usada no cálculo do tempo de reposição.</small></label>`}
    <label class="f"><span>Data do recebimento<b class="rq" aria-hidden="true"> *</b></span><input type="date" required max="${ymd(T0)}" value="${esc(E.recebidoEm??ymd(T0))}" data-d="ent.recebidoEm"></label></div>
   <h2 class="sh3" style="margin:16px 0 8px">Insumos recebidos</h2><datalist id="dl-ent">${its.map(i=>`<option value="${esc(i.cod)}" label="${esc(i.nome)}"></option>`).join('')}</datalist>
   <div class="tw"><table class="t"><thead><tr><th>Código</th><th>Insumo</th>${E.ped?'<th class="num">Pedido</th>':''}<th>Qtd recebida</th><th>Lote</th><th>Validade</th><th><span class="sr">Divergência</span></th><th><span class="sr">Remover linha</span></th></tr></thead><tbody>${rows}</tbody></table></div>
   <div style="margin-top:10px"><button type="button" class="btn sec sm" data-act="ent-add">${ico('plus',16)}Adicionar insumo</button></div>
   <div class="err hide" role="alert"></div>
   <div class="mf"><button type="button" class="btn sec" data-act="ent-clear">Limpar</button><button class="btn" type="submit">${ico('file',18)}Confirmar recebimento e emitir nota</button></div></form>`;
  return h}
var CB={
  entPed(v){const E=D.ent;if(!v){E.rows=[{}];E.pedidoEm='';return}const p=S.requests.find(r=>r.id===v);E.pedidoEm=p.data;E.rows=p.itens.map(x=>{const it=itemById(x.item);return{cod:it.cod,ped:x.qtd,rec:x.qtd}})},
};
function notaModal(id){
  const r=S.receipts.find(x=>x.id===id);
  modal(`Nota de recebimento ${r.id}`,`<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:12px"><b style="font-size:16px;color:var(--heading)">Clínica Digital UFPE</b><div class="small" style="text-align:right"><b>${esc(clinicName(r.clinic))}</b><br>Emitida em ${fDT(r.ts)} por ${esc(userName(r.user))}</div></div>
   <p class="small" style="margin-bottom:6px"><b>Origem:</b> ${esc(originLabel(r.origem))} &nbsp;·&nbsp; <b>Data do pedido:</b> ${fD(r.pedidoEm)} &nbsp;·&nbsp; <b>Recebimento:</b> ${fD(r.recebidoEm)}</p>
   ${budget()?'':`<p class="small" style="margin-bottom:10px"><b>Carta do doador:</b> ${esc(r.carta||'—')} &nbsp;·&nbsp; <b>Comprovante:</b> ${esc(r.comprovante||'—')}</p>`}
   ${table(budget()?['Código','Insumo','Qtd recebida','Custo unit.','Total']:['Código','Insumo','Qtd recebida','Lote','Validade'],r.rows.map(x=>{const it=itemById(x.item);return `<tr><td>${esc(it.cod)}</td><td><b>${esc(it.nome)}</b>${!budget()&&x.ped!=null&&x.rec!==x.ped?`<small>Divergência: pedido ${num(x.ped)} · recebido ${num(x.rec)}</small>`:''}</td><td class="num">${num(x.rec)} ${it.un}</td>${budget()?`<td class="num">${brl(custoU(it))}</td><td class="num"><b>${brl(x.rec*custoU(it))}</b></td>`:`<td>${esc(x.lote||'—')}</td><td>${valTag(x.val,it)}</td>`}</tr>`}))}
   ${budget()?`<p class="small" style="margin-top:8px;text-align:right"><b>Valor total da nota:</b> ${brl(notaValor(r))}</p>`:''}
   ${r.estornada?`<p style="margin-top:10px">${pill('estorno','Nota estornada')}</p>`:''}
   <div class="mf"><button class="btn sec" data-act="mclose">Fechar</button>${expButtons('nota',r.id)}</div>`,true)}
function estornoNota(id){
  const r=S.receipts.find(x=>x.id===id);
  // regra: só estorna se NENHUM item dos lotes da nota foi movimentado depois da entrada
  const bad=[];for(const x of r.rows){const l=S.lots.find(z=>z.id===x.lot);
    if(!l){bad.push({x,why:'lote anterior ao novo controle de movimentações'});continue}
    const mvd=S.moves.find(m=>m.lot===x.lot&&m.origem!=='nota:'+r.id&&new Date(m.ts)>=new Date(r.ts));
    if(mvd)bad.push({x,why:`${PILL[mvd.tipo][0].toLowerCase()} em ${fDT(mvd.ts)}`})}
  if(bad.length){const it=itemById(bad[0].x.item);
    modal('Estorno não permitido',`<div class="callout e"><b>Regra:</b> uma nota de recebimento só pode ser estornada se nenhum item do lote tiver sido movimentado.<br><br>O lote <b>${esc(bad[0].x.lote)}</b> de <b>${esc(it.nome)}</b> já tem movimentação: ${esc(bad[0].why)}.</div><div class="mf"><button class="btn" data-act="mclose">Entendi</button></div>`);return}
  formModal(`Estornar nota ${r.id}`,[{k:'just',l:'Motivo do estorno',t:'textarea',req:1,full:1}],null,v=>{
    if(!v.just||v.just.trim().length<3)return 'Informe o motivo.';
    for(const x of r.rows){const l=S.lots.find(z=>z.id===x.lot),it=itemById(x.item);l.qtd=Math.max(0,l.qtd-x.rec);mv({item:it.id,clinic:r.clinic,lot:l.id,loteTxt:l.lote,qtd:-x.rec,tipo:'estorno',motivo:v.just.trim(),origem:'nota:'+r.id,estornoNota:r.id})}
    r.estornada=true;aud('Estorno','Nota de recebimento',`${r.id} estornada (${v.just.trim()})`,r.clinic);commit('Nota estornada e saldo revertido.');return null},
    {submit:'Estornar nota',extra:`<div class="callout i" style="margin-top:12px">Nenhum item dos lotes desta nota foi movimentado desde a entrada — estorno permitido.</div>`})}
function vAbandonados(){
  const cl=me().clinic;const list=S.abandoned.filter(a=>a.clinic===cl).sort((a,b)=>b.ts.localeCompare(a.ts));const prazo=S.cfg.prazoAbandono;
  return `<div class="callout i" style="margin-bottom:12px"><b>Produto recebido errado e não trocado:</b> o produto fica no almoxarife. Depois de ${prazo} dias da notificação à empresa, ele é descartado ou incorporado ao estoque da clínica.</div>
   <div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn" data-act="ab-new">${ico('plus',18)}Registrar recebimento incorreto</button></div>`+
   table(['Código','Produto recebido','Qtd','Empresa','Notificada em','Prazo','Situação','Ações'],list.map(a=>{const d=abDias(a),restam=prazo-d,open=a.status==='aguardando',vencido=open&&restam<=0;
    const k=!open?a.status:vencido?'abandonado':'aguardando';
    return `<tr class="${open?'':'off'}"><td><b>${a.id}</b><small>${fD(a.ts)}</small></td><td><b>${esc(a.desc)}</b>${a.obs?`<small>${esc(a.obs)}</small>`:''}</td><td class="num">${num(a.qtd)} ${esc(a.un)}</td><td>${esc(a.empresa)}</td><td class="nowrap">${fD(a.notificadoEm)}<small>há ${d} dia${d===1?'':'s'}</small></td><td>${open?(vencido?`<b style="color:var(--status-danger-text)">vencido há ${-restam} d</b>`:`faltam ${restam} d`):'—'}</td><td>${pill(k)}</td>
     <td class="act">${open?`<button class="btn sm sec" data-act="ab-trocado" data-id="${a.id}">Troca realizada</button> <button class="btn sm" data-act="ab-incorporar" data-id="${a.id}" ${vencido?'':'disabled title="Disponível após '+prazo+' dias da notificação"'}>Incorporar</button> <button class="btn sm dng" data-act="ab-descartar" data-id="${a.id}" ${vencido?'':'disabled title="Disponível após '+prazo+' dias da notificação"'}>Descartar</button>`:`<span class="small muted">${a.resolvidoEm?'em '+fD(a.resolvidoEm):''}</span>`}</td></tr>`}),'Nenhum recebimento incorreto registrado.')}
function abNew(){
  formModal('Registrar recebimento incorreto',[
   {k:'desc',l:'Produto recebido (descrição)',req:1,full:1,h:'O que chegou, e o que estava errado.'},
   {k:'qtd',l:'Quantidade',t:'number',req:1,min:0},{k:'un',l:'Unidade',t:'select',opts:UNIDADES,req:1},
   {k:'empresa',l:'Empresa fornecedora',req:1,full:1},
   {k:'notificadoEm',l:'Data em que a empresa foi notificada',t:'date',req:1,def:ymd(T0)},
   {k:'obs',l:'Observação (opcional)',t:'textarea',full:1}],null,v=>{
    if(!(v.qtd>0))return 'Informe a quantidade.';if(parseD(v.notificadoEm)>T0)return 'A data de notificação não pode ser futura.';
    const a={id:'AB-'+String(S.seq.ab++).padStart(4,'0'),clinic:me().clinic,ts:nowISO(),user:S.session,desc:v.desc.trim(),qtd:v.qtd,un:v.un,empresa:v.empresa.trim(),notificadoEm:v.notificadoEm,obs:(v.obs||'').trim(),status:'aguardando'};
    S.abandoned.push(a);aud('Criação','Recebimento incorreto',`${a.id}: ${a.desc} (${a.empresa})`);commit(`${a.id} registrado. Prazo de ${S.cfg.prazoAbandono} dias a partir da notificação.`);return null},{submit:'Registrar'})}
function abIncorporar(id){
  const a=S.abandoned.find(x=>x.id===id);const its=myItems();
  formModal(`Incorporar ao estoque — ${a.id}`,[
   {k:'cod',l:'Código do insumo correspondente',req:1,h:'Ex.: INS-0001. O produto passa a compor o saldo da clínica.'},
   {k:'qtd',l:'Quantidade a incorporar',t:'number',req:1,min:0,def:a.qtd},
   {k:'lote',l:'Lote',h:'Obrigatório se o insumo controla lote.'},{k:'val',l:'Validade',t:'date'}],null,v=>{
    const it=findByCode(v.cod,its);if(!it)return 'Código de insumo não encontrado nesta clínica.';if(!(v.qtd>0))return 'Informe a quantidade.';
    if(it.lote&&(!v.lote||!v.val))return `"${it.nome}" controla lote: informe lote e validade.`;
    const lot=addLot(it,v.lote,v.val||null,v.qtd);
    mv({item:it.id,clinic:it.clinic,lot:lot.id,loteTxt:lot.lote,qtd:v.qtd,tipo:'entrada',motivo:`Produto abandonado incorporado (${a.empresa})`,origem:'abandonado:'+a.id});
    a.status='incorporado';a.resolvidoEm=ymd(T0);aud('Incorporação','Recebimento incorreto',`${a.id} incorporado: ${num(v.qtd)} × ${it.nome}`);commit(`${a.id} incorporado ao estoque.`);return null},{submit:'Incorporar'})}
function abDescartar(id){
  const a=S.abandoned.find(x=>x.id===id);
  formModal(`Descartar — ${a.id}`,[{k:'just',l:'Como será o descarte?',t:'textarea',req:1,full:1}],null,v=>{
    if(!v.just||v.just.trim().length<3)return 'Informe como o descarte será feito.';
    a.status='descartado';a.resolvidoEm=ymd(T0);aud('Descarte','Recebimento incorreto',`${a.id} descartado (${v.just.trim()})`);commit(`${a.id} descartado.`);return null},{submit:'Confirmar descarte',extra:'<p class="small muted" style="margin-top:10px">O produto nunca compôs o saldo, então não há baixa de estoque.</p>'})}

/* =====================================================================
   NOTIFICAÇÕES
   ===================================================================== */
const ntRelevant=u=>NT_TIPOS.filter(t=>u.perfil==='superuser'||!t.roles||t.roles.includes(u.perfil));
function vNotif(){
  const t=tabOf('notif','lista');const u=me();const all=visibleNotifs();const pr=S.prefs[u.id];
  let h=pageHead('Central de notificações',`Histórico de alertas com marcação de lida; canais externos (e-mail / WhatsApp) simulados neste protótipo.`,all.some(n=>!n.lida)?`<button class="btn sec" data-act="n-all">${ico('check',18)}Marcar todas como lidas</button>`:'');
  h+=tabsHtml('notif',[['lista','Alertas'],['pref','Preferências']],'lista');
  if(t==='pref'){
    return h+`<div class="card"><h2>Quais alertas receber e por qual canal</h2>
     ${table(['Alerta','No aplicativo','E-mail','WhatsApp'],ntRelevant(u).map(x=>`<tr><td><b>${x.l}</b><small>${x.d}</small></td>${['app','email','wa'].map(c=>`<td><label class="sw"><input type="checkbox" data-act="pref" data-t="${x.k}" data-c="${c}" ${prefOf(u,x.k)[c]?'checked':''} aria-label="${x.l} — ${c}"><span></span></label></td>`).join('')}</tr>`))}
     <div class="swrow"><div><b>Agrupar alertas do mesmo tipo em resumo periódico</b><div class="small muted">Evita excesso de mensagens.</div></div><label class="sw"><input type="checkbox" data-act="pref-resumo" ${pr&&pr.resumo?'checked':''} aria-label="Agrupar em resumo"><span></span></label></div>
     <div class="swrow"><div><b>Enviar mensagem de teste</b><div class="small muted">Simula o envio por e-mail/WhatsApp para ${esc(u.email)}.</div></div><button class="btn sm sec" data-act="n-test">Enviar teste</button></div></div>`}
  const list=all.slice(0,80);
  const chs=n=>{const p=prefOf(u,n.tipo);return `${p.email?`<span class="pill">${ico('mail',13)} e-mail (simulado)</span>`:''}${p.wa?`<span class="pill">${ico('chat',13)} WhatsApp (simulado)</span>`:''}`};
  const one=n=>{const x=NT[n.tipo];return `<div class="nt ${n.lida?'':'un'}">${seal(x.ic,x.ico,18)}<div class="b"><b>${esc(n.titulo)}</b><div class="small">${esc(n.texto)}</div><div class="chips">${pillN(n.tipo)}<span class="small muted">${fDT(n.ts)}${n.clinic&&isSuper()?' · '+esc(clinicName(n.clinic)):''}</span>${chs(n)}</div></div>${n.lida?'':`<button class="btn sm ghost" data-act="n-read" data-id="${n.id}">Marcar lida</button>`}</div>`};
  if(pr&&pr.resumo){
    const g={};list.forEach(n=>(g[n.tipo]=g[n.tipo]||[]).push(n));
    return h+`<div class="callout i" style="margin-bottom:12px">Visão em <b>resumo agrupado</b>: alertas do mesmo tipo reunidos em um único digest.</div>`+(NT_TIPOS.filter(x=>g[x.k]).map(x=>`<div class="card" style="margin-bottom:12px"><div class="chd"><h2>${x.l} — ${g[x.k].length} alerta(s)</h2></div>${g[x.k].slice(0,6).map(one).join('')}</div>`).join('')||'<div class="card empty">Sem notificações.</div>')}
  return h+`<div class="card">${list.map(one).join('')||emptyState({icon:'bell',title:'Nenhuma notificação',desc:'Os alertas de estoque aparecem aqui.'})}</div>`}

/* =====================================================================
   MOVIMENTAÇÕES
   ===================================================================== */
const movDe=()=>dv('mov.de',ymd(addDays(-30))),movAte=()=>dv('mov.ate',ymd(T0));
function movRange(){let a=movDe(),b=movAte();if(a&&b&&a>b){const t=a;a=b;b=t}return{a,b}}
function filteredMoves(){
  const q=(dv('mov.q')||'').toLowerCase(),tp=dv('mov.tipo'),usr=dv('mov.user');const {a,b}=movRange();
  const t0=a?parseD(a).getTime():0,t1=b?parseD(b).getTime()+MS:Infinity;
  return S.moves.filter(m=>{const t=new Date(m.ts).getTime();return scope().includes(m.clinic)&&t>=t0&&t<t1&&(!tp||m.tipo===tp)&&(!usr||m.user===usr)&&(!q||(((itemById(m.item)||{}).nome||'')+((itemById(m.item)||{}).cod||'')).toLowerCase().includes(q)||userName(m.user).toLowerCase().includes(q)||(m.motivo||'').toLowerCase().includes(q))}).sort((x,y)=>y.ts.localeCompare(x.ts))}
function vMov(){
  const sup=scope().length>1;const all=filteredMoves();const list=all.slice(0,UI.limit);
  let h=pageHead('Movimentações','',
    can('relatorios')?expButtons('mov'):'');
  const usersIn=S.users.filter(u=>isSuper()||u.clinic===me().clinic).sort((x,y)=>x.nome.localeCompare(y.nome));
  h+=`<div class="filters noprint"><label class="f grow"><span>Buscar</span><input id="mov-q" type="text" placeholder="Insumo, código, usuário ou motivo" value="${esc(dv('mov.q'))}" data-d="mov.q" data-r="live"></label>
   <label class="f"><span>Categoria</span><select data-d="mov.tipo" data-r="1">${selOpts(MOV_TIPOS.map(k=>[k,PILL[k][0]]),dv('mov.tipo'),'Todas')}</select></label>
   <label class="f"><span>Usuário</span><select data-d="mov.user" data-r="1">${selOpts(usersIn.map(u=>[u.id,u.nome+(u.perfil==='superuser'?'':' · '+PERFIS[u.perfil])]),dv('mov.user'),'Todos')}</select></label>
   <label class="f"><span>De</span><input type="date" max="${ymd(T0)}" value="${esc(movDe())}" data-d="mov.de" data-r="1" aria-label="Data inicial"></label>
   <label class="f"><span>Até</span><input type="date" max="${ymd(T0)}" value="${esc(movAte())}" data-d="mov.ate" data-r="1" aria-label="Data final"></label></div>
`;
  h+=table(['Data / hora',...(sup?['Clínica']:[]),'Usuário','Insumo',...(budget()?['Valor']:['Lote','Qtd']),'Categoria','Detalhe',''],list.map(m=>{const it=itemById(m.item);return `<tr class="${m.estornado?'off':''}"><td class="nowrap">${fDT(m.ts)}</td>${sup?`<td>${esc(clinicName(m.clinic))}</td>`:''}<td>${esc(userName(m.user))}</td><td><b>${esc(it?it.nome:'—')}</b><small>${esc(it?it.cod:'')}</small></td>${budget()?`<td class="num">${it&&custoU(it)?(m.qtd>0?'+':'−')+brl(Math.abs(m.qtd)*custoU(it)):'—'}</td>`:`<td>${esc(m.loteTxt||'—')}</td><td class="num"><b>${m.qtd>0?'+':''}${num(m.qtd)}</b> ${it?it.un:''}</td>`}<td>${pill(m.tipo)}${m.estornado?' '+pill('estorno','Estornada'):''}</td><td class="small">${esc(m.motivo||'')}${m.destinatario?`<small>Destinatário: ${esc(m.destinatario)}</small>`:''}${m.pessoa?`<small>Retirado e devolvido por: ${esc(pessoaTxt(m.pessoa))}</small>`:''}<small>${esc(m.origem||'')}</small></td><td class="act noprint">${canUndo(m)?`<button class="btn sm sec" data-act="estornar" data-id="${m.id}">${ico('undo',14)}Estornar</button>`:''}</td></tr>`}),'Nenhuma movimentação no período/filtro.');
  if(all.length>list.length)h+=`<div style="text-align:center;margin-top:12px"><button class="btn sec" data-act="more">Mostrar mais (${all.length-list.length} restantes)</button></div>`;
  return h}

/* =====================================================================
   RELATÓRIOS — em quantidade
   ===================================================================== */
let EXPORT=null;
function hbars(rows,max,cls){return rows.map(r=>`<div class="hbar"><span title="${esc(r.l)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.l)}</span><div class="tr"><i class="${cls||''}" style="width:${max?Math.max(r.v/max*100,1):0}%"></i></div><b class="num">${esc(r.t)}</b></div>`).join('')}
function vRel(){
  if(!can('relatorios'))return noPerm();
  const med=budget()?'valor':'qtd',isVal=med==='valor';const fq=(q,u)=>isVal?brl(q):`${num(q)} ${u}`;const wq=it=>isVal?custoU(it):1;
  const t=tabOf('rel','consumo');const dias=+dv('rel.dias',30);const cut=Date.now()-dias*MS;const sup=scope().length>1;const cat=dv('rel.cat'),cod=dv('rel.cod');
  const pool=scopeItems();const codes=[...new Map(pool.map(i=>[i.cod,i])).values()].sort((a,b)=>a.nome.localeCompare(b.nome));
  let h=pageHead('Relatórios e análises',`${esc(scopeLabel())} · consumo, perdas e curva ABC, ${budget()?'em valor (R$)':'em quantidade'}. Exporte em PDF ou Excel.`,expButtons('rel'));
  h+=tabsHtml('rel',[['consumo','Consumo'],['perdas','Perdas'],['abc','Curva ABC']],'consumo');
  h+=`<div class="filters noprint"><label class="f"><span>Período</span><select data-d="rel.dias" data-r="1">${selOpts([[7,'Últimos 7 dias'],[30,'Últimos 30 dias'],[90,'Últimos 90 dias']],dias)}</select></label>
   <label class="f"><span>Categoria</span><select data-d="rel.cat" data-r="1">${selOpts(scopeCats(),cat,'Todas')}</select></label>
   <label class="f"><span>Insumo</span><select data-d="rel.cod" data-r="1">${selOpts(codes.map(i=>[i.cod,`${i.cod} · ${i.nome}`]),cod,'Todos')}</select></label>
   ${t==='consumo'?`<label class="f"><span>Agrupar por</span><select data-d="rel.by" data-r="1">${selOpts([['item','Insumo'],['clinic','Clínica (escolha um insumo)'],['sem','Semana (escolha um insumo)']],dv('rel.by','item'))}</select></label>`:''}</div>`;
  const mm=(tipos)=>S.moves.filter(m=>tipos.includes(m.tipo)&&scope().includes(m.clinic)&&new Date(m.ts)>=cut&&!m.estornado).map(m=>({m,it:itemById(m.item)})).filter(x=>x.it&&(!cat||x.it.cat===cat)&&(!cod||x.it.cod===cod));
  if(t==='consumo'){
    const by=dv('rel.by','item');
    if(by!=='item'&&!cod&&!isVal)return h+`<div class="card">${emptyState({icon:'search',title:'Escolha um insumo',desc:`Escolha um insumo no filtro acima para agrupar por ${by==='clinic'?'clínica':'semana'}. Quantidades de insumos com unidades diferentes não podem ser somadas.`})}</div>`;
    const g={};
    for(const {m,it} of mm(['consumo','devolucao'])){let k,l;
      if(by==='item'){k=it.id;l=`${it.nome}${sup?' · '+clinicName(it.clinic).replace('Clínica-Escola de ',''):''}`}
      else if(by==='clinic'){k=it.clinic;l=clinicName(it.clinic)}
      else{const d=new Date(m.ts);const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));mon.setHours(0,0,0,0);k=ymd(mon);l='Semana de '+fD(ymd(mon))}
      g[k]=g[k]||{l,q:0,u:isVal?'R$':it.un};g[k].q+=-m.qtd*wq(it)}
    let rows=Object.entries(g).map(([k,x])=>({k,...x,q:Math.max(0,x.q)}));rows.sort((a,b)=>by==='sem'?a.k.localeCompare(b.k):b.q-a.q);
    const mx=Math.max(...rows.map(r=>r.q),1);
    EXPORT={name:'consumo',rows:isVal?[['Agrupamento','Valor consumido (R$)'],...rows.map(r=>[r.l,brl(r.q)])]:[['Agrupamento','Quantidade','Unidade'],...rows.map(r=>[r.l,num(r.q),r.u])]};
    h+=`<div class="grid g2"><div class="card"><h2>Consumo por ${({item:'insumo',clinic:'clínica',sem:'semana'})[by]}</h2>${hbars(rows.slice(0,10).map(r=>({l:r.l,v:r.q,t:fq(r.q,r.u)})),mx)||emptyState({icon:'chart',title:'Sem consumo no período'})}${by==='item'&&!isVal?'<p class="small muted" style="margin-top:8px">As barras comparam quantidades em unidades diferentes: use para ordenar, não para somar.</p>':''}</div>
    <div class="card"><h2>Detalhamento</h2>${table(['Agrupamento','Qtd'],rows.slice(0,40).map(r=>`<tr><td>${esc(r.l)}</td><td class="num">${fq(r.q,r.u)}</td></tr>`),'Sem consumo no período.')}</div></div>`}
  if(t==='perdas'){
    const rs=mm(['vencimento','descarte']);const g={vencimento:[],descarte:[]};rs.forEach(x=>g[x.m.tipo].push(x));
    EXPORT={name:'perdas',rows:[['Data','Clínica','Insumo','Código',...(budget()?['Valor (R$)']:['Lote','Quantidade','Unidade']),'Categoria','Motivo'],...rs.map(({m,it})=>[fDT(m.ts),clinicName(m.clinic),it.nome,it.cod,...(budget()?[brl(-m.qtd*custoU(it))]:[m.loteTxt,num(-m.qtd),it.un]),PILL[m.tipo][0],m.motivo])]};
    h+=`<div class="grid g2">${[['vencimento','clock','re'],['descarte','trash','am']].map(([k,ic,c])=>`<div class="card kpi">${seal(ic,c)}<div><b>${budget()?brl(g[k].reduce((s,x)=>s+(-x.m.qtd)*custoU(x.it),0)):g[k].length}</b><small>${PILL[k][0]} · ${budget()?g[k].length+' registro(s)':new Set(g[k].map(x=>x.it.id)).size+' insumo(s) distinto(s)'}</small></div></div>`).join('')}</div>
    <div class="card mt"><h2>Registros de perda por validade e descarte por avaria</h2>${table(['Data','Insumo',...(budget()?['Valor']:['Lote','Qtd']),'Categoria','Motivo'],rs.sort((a,b)=>b.m.ts.localeCompare(a.m.ts)).slice(0,50).map(({m,it})=>`<tr><td class="nowrap">${fDT(m.ts)}</td><td><b>${esc(it.nome)}</b><small>${esc(it.cod)}${sup?' · '+esc(clinicName(m.clinic)):''}</small></td>${budget()?`<td class="num">${brl(-m.qtd*custoU(it))}</td>`:`<td>${esc(m.loteTxt||'—')}</td><td class="num">${num(-m.qtd)} ${it.un}</td>`}<td>${pill(m.tipo)}</td><td class="small">${esc(m.motivo||'')}</td></tr>`),'Nenhuma perda no período.')}</div>`}
  if(t==='abc'){
    const g={};for(const {m,it} of mm(['consumo','devolucao'])){g[it.id]=g[it.id]||{it,q:0};g[it.id].q+=-m.qtd*wq(it)}
    let rows=Object.values(g).map(r=>({...r,q:Math.max(0,r.q)})).filter(r=>r.q>0).sort((a,b)=>b.q-a.q);const tot=rows.reduce((s,r)=>s+r.q,0)||1;let acc=0;
    rows.forEach(r=>{const before=acc/tot*100;acc+=r.q;r.cum=acc/tot*100;r.cls=before<80?'A':before<95?'B':'C'});
    EXPORT={name:'curva-abc',title:isVal?'Curva ABC por valor consumido':undefined,rows:[['Posição','Insumo','Código','Clínica','Consumo','Unidade','% acumulado','Classe'],...rows.map((r,i)=>[i+1,r.it.nome,r.it.cod,clinicName(r.it.clinic),isVal?brl(r.q):num(r.q),isVal?'R$':r.it.un,r.cum.toFixed(1).replace('.',','),r.cls])]};
    const W=560,H2=210,pl=30,pb=24,pt=12,n=rows.length||1,bw=(W-pl-34)/n,mx=Math.max(...rows.map(r=>r.q),1);
    const bars=rows.map((r,i)=>{const bh=(H2-pt-pb)*r.q/mx,x=pl+i*bw+bw*.12;return `<rect x="${x}" y="${H2-pb-bh}" width="${bw*.76}" height="${Math.max(bh,1)}" rx="2" fill="${r.cls==='A'?'var(--roxo)':r.cls==='B'?'var(--ciano-esc)':'var(--s-baixo)'}"><title>${esc(r.it.nome)} — ${fq(r.q,r.it.un)} (${r.cls})</title></rect>`}).join('');
    const line=rows.map((r,i)=>`${pl+i*bw+bw*.5},${pt+(H2-pt-pb)*(1-r.cum/100)}`).join(' ');
    h+=`<div class="card"><div class="chd"><h2>Curva ABC por ${isVal?'valor consumido':'quantidade consumida'}</h2></div>
     <svg class="chart" viewBox="0 0 ${W} ${H2}" width="100%" role="img" aria-label="Curva ABC">${[0,50,80,100].map(p=>`<line x1="${pl}" x2="${W-34}" y1="${pt+(H2-pt-pb)*(1-p/100)}" y2="${pt+(H2-pt-pb)*(1-p/100)}" stroke="var(--line)"/><text x="${pl-4}" y="${pt+(H2-pt-pb)*(1-p/100)+4}" text-anchor="end">${p}%</text>`).join('')}${bars}<polyline points="${line}" fill="none" stroke="var(--s-dev)" stroke-width="2.2"/></svg>
     <div class="chips" style="margin:6px 0 12px"><span class="pill"><i style="background:var(--roxo)"></i>Classe A (até 80%)</span><span class="pill"><i style="background:var(--ciano-esc)"></i>Classe B (até 95%)</span><span class="pill"><i style="background:var(--s-baixo)"></i>Classe C</span><span class="pill"><i style="background:var(--s-dev)"></i>% acumulado</span></div>
     ${table(['#','Insumo','Consumo','% acum.','Classe'],rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.it.nome)}</b><small>${esc(r.it.cod)}${sup?' · '+esc(clinicName(r.it.clinic)):''}</small></td><td class="num">${fq(r.q,r.it.un)}</td><td class="num">${num(r.cum)}%</td><td><b>${r.cls}</b></td></tr>`),'Sem consumo no período.')}<p class="small muted" style="margin-top:8px">${isVal?'Curva calculada sobre o valor consumido (quantidade × custo unitário de referência).':'Sem preço no cadastro, a curva usa a quantidade. Como as unidades variam (caixa, frasco, dose), use como indicativo de giro.'}</p></div>`}
  return h}

/* =====================================================================
   CADASTROS
   ===================================================================== */
function vCad(){
  const tabs=[...(can('cad_insumos')?[['ins','Insumos'],['cat','Categorias'],['pk','Pacotes']]:can('cad_custo')?[['ins','Insumos']]:[]),...(can('cad_usuarios')?[['usr','Usuários']]:[]),...(can('cad_clinicas')?[['cli','Clínicas']]:[])];
  if(!tabs.length)return noPerm();
  const t=tabs.find(x=>x[0]===tabOf('cad',tabs[0][0]))?tabOf('cad',tabs[0][0]):tabs[0][0];
  let h=pageHead('Cadastros','Insumos, categorias da clínica, pacotes de insumos, usuários e clínicas.');
  const NEWL={ins:'Novo insumo',cat:'Nova categoria',pk:'Novo pacote',usr:'Novo usuário',cli:'Nova clínica'};
  h+=tabsHtml('cad',tabs,tabs[0][0],t==='ins'&&!can('cad_insumos')?'':`<button class="btn sm" data-act="cad-new" data-t="${t}" title="${NEWL[t]}" aria-label="${NEWL[t]}">${ico('plus',16)}Novo</button>`);
  const cl=me().clinic;
  if(t==='ins'){const its=S.items.filter(i=>i.clinic===cl).sort((a,b)=>a.nome.localeCompare(b.nome));
    return h+table(budget()?['Código','Insumo','Categoria','Un.','Custo unitário','Ações']:['Código','Insumo','Categoria','Un.','Lote e validade','Temperatura','Reposição estimada','Ações'],its.map(i=>`<tr class="${i.ativo?'':'off'}"><td><b>${esc(i.cod)}</b></td><td><b>${esc(i.nome)}</b></td><td>${esc(i.cat)}</td><td>${esc(i.un)}</td>${budget()?`<td class="num">${custoU(i)?brl(custoU(i)):'<span class="muted small">sem custo</span>'}</td>`:''}${budget()?'':`<td class="small">${i.lote?`controla · alerta ${i.antec} d antes`:'não controla'}</td><td class="small">${i.regTemp&&i.temp?esc(TEMPS[i.temp]):'não registra'}</td><td class="num">${num(leadTime(i).dias)} d<small>${leadTime(i).n?'medido em '+leadTime(i).n+' entrada(s)':'estimado'}</small></td>`}<td class="act">${can('cad_insumos')?`<button class="btn sm sec" data-act="ins-edit" data-id="${i.id}">${ico('edit',14)}Editar</button> <button class="btn sm ghost" data-act="ins-toggle" data-id="${i.id}">${i.ativo?'Inativar':'Reativar'}</button>`:''}${can('cad_custo')?` <button class="btn sm sec" data-act="ins-custo" data-id="${i.id}">${ico('edit',14)}Editar custo</button>`:''}</td></tr>`))}
  if(t==='cat'){
    return h+`<div class="callout i" style="margin-bottom:12px">As categorias de insumo são próprias de cada clínica. Renomear uma categoria atualiza todos os insumos dela.</div>`+table(['Categoria','Insumos','Situação','Ações'],(S.cats[cl]||[]).map(c=>{const n=S.items.filter(i=>i.clinic===cl&&i.cat===c.nome&&i.ativo).length;return `<tr class="${c.ativo?'':'off'}"><td><b>${esc(c.nome)}</b></td><td class="num">${n}</td><td>${c.ativo?pill('ok','Ativa'):pill('zerado','Inativa')}</td><td class="act"><button class="btn sm sec" data-act="cat-rename" data-id="${c.id}">${ico('edit',14)}Renomear</button> <button class="btn sm ghost" data-act="cat-toggle" data-id="${c.id}">${c.ativo?'Inativar':'Reativar'}</button></td></tr>`}))}
  if(t==='pk'){const pk=S.packages.filter(p=>p.clinic===cl);
    return h+table(['Pacote de insumos','Grupo de material','Insumos e quantidades padrão','Ações'],pk.map(p=>`<tr class="${p.ativo?'':'off'}"><td><b>${esc(p.nome)}</b></td><td>${esc(p.grupo)}</td><td class="small">${p.itens.map(r=>{const it=itemById(r.item);return it?`${esc(it.nome.split('(')[0].trim())} <b>×${num(r.qtd)}</b>`:''}).join(' · ')}</td><td class="act"><button class="btn sm sec" data-act="pk-edit" data-id="${p.id}">${ico('edit',14)}Editar</button> <button class="btn sm ghost" data-act="pk-toggle" data-id="${p.id}">${p.ativo?'Inativar':'Reativar'}</button></td></tr>`),'Nenhum pacote cadastrado.')}
  if(t==='usr'){const us=S.users.filter(u=>isSuper()?true:u.clinic===cl);
    return h+table(['Usuário','Perfil','Clínica','Situação','Ações'],us.map(u=>`<tr class="${u.ativo?'':'off'}"><td><b>${esc(u.nome)}</b><small>${esc(u.email)}</small></td><td>${esc(PERFIS[u.perfil])}</td><td>${esc(u.clinic?clinicName(u.clinic):'Toda a rede')}</td><td>${u.ativo?pill('ok','Ativo'):pill('zerado','Inativo')}</td><td class="act"><button class="btn sm sec" data-act="usr-edit" data-id="${u.id}">${ico('edit',14)}Editar</button> ${u.id!==S.session?`<button class="btn sm ghost" data-act="usr-toggle" data-id="${u.id}">${u.ativo?'Inativar':'Reativar'}</button>`:''}</td></tr>`))}
  if(t==='cli')return h+table(['Clínica','Endereço','Responsável','Situação','Ações'],S.clinics.map(c=>`<tr class="${c.ativo?'':'off'}"><td><b>${esc(c.nome)}</b></td><td>${esc(c.end)}</td><td>${esc(c.resp)}</td><td>${c.ativo?pill('ok','Ativa'):pill('zerado','Inativa')}</td><td class="act"><button class="btn sm sec" data-act="cli-edit" data-id="${c.id}">${ico('edit',14)}Editar</button></td></tr>`));
  return h}
const FS={
 ins:(cur)=>{const cats=catsOf(me().clinic);if(cur&&!cats.includes(cur.cat))cats.push(cur.cat);return [
  {k:'cod',l:'Código',ro:1,def:'(gerado pelo sistema ao salvar)'},{k:'nome',l:'Nome do insumo',req:1,full:1},
  {k:'cat',l:'Categoria',t:'select',opts:cats,req:1},{k:'un',l:'Unidade de medida',t:'select',opts:UNIDADES,req:1},
  {k:'regTemp',l:'Precisa registrar temperatura de armazenamento',t:'check'},
  {k:'temp',l:'Temperatura de armazenamento',t:'select',opts:Object.entries(TEMPS),showIf:'regTemp'},
  {k:'lote',l:'Tem controle de lote e validade',t:'check',def:true},
  {k:'reposicao',l:'Tempo de reposição estimado (dias)',t:'number',req:1,min:0,def:7,h:'Usado até haver entradas com data de pedido; depois vale o tempo medido.'},
  {k:'antec',l:'Antecedência do alerta de validade (dias)',t:'number',min:0,def:30,showIf:'lote'}]},
 usr:()=>[{k:'nome',l:'Nome completo',req:1,full:1},{k:'email',l:'E-mail institucional',t:'email',req:1,full:1},{k:'perfil',l:'Perfil de acesso',t:'select',opts:isSuper()?[['admin','Administrador'],['almoxarife','Almoxarife'],['controlador','Controlador Orçamentário'],['superuser','Superuser']]:[['almoxarife','Almoxarife'],['admin','Administrador']],req:1},
  {k:'clinic',l:'Clínica vinculada',t:'select',opts:S.clinics.map(c=>[c.id,c.nome]),ph:'— (rede, apenas superuser)'}],
 cli:()=>[{k:'nome',l:'Nome da clínica',req:1,full:1},{k:'end',l:'Endereço',req:1,full:1},{k:'resp',l:'Responsável',req:1}],
};
function crud(kind,id){
  const list={ins:S.items,usr:S.users,cli:S.clinics}[kind];const cur=id?list.find(x=>x.id===id):null;
  const label={ins:'insumo',usr:'usuário',cli:'clínica'}[kind];
  const vals=cur?Object.assign({},cur):(kind==='ins'?{}:null);
  if(kind==='ins'&&cur)vals.cod=cur.cod;
  formModal(`${cur?'Editar':'Novo'} ${label}`,FS[kind](cur),vals,v=>{
    if(kind==='usr'){if(v.perfil!=='superuser'&&!v.clinic)return 'Informe a clínica do usuário.';if(!isSuper()&&v.perfil!=='superuser')v.clinic=me().clinic;if(v.perfil==='superuser')v.clinic=null;
      if(S.users.some(u=>u.email.toLowerCase()===v.email.toLowerCase()&&u.id!==id))return 'Já existe usuário com este e-mail.'}
    if(kind==='ins'){if(v.regTemp&&!v.temp)return 'Escolha a temperatura de armazenamento.';if(v.lote&&(v.antec==null))return 'Informe a antecedência do alerta de validade.';
      v.temp=v.regTemp?v.temp:null;v.antec=v.lote?v.antec:0}
    if(cur){Object.assign(cur,v);aud('Edição',label,`${cur.nome} atualizado`,cur.clinic===undefined?me().clinic:cur.clinic)}
    else{const o=Object.assign({ativo:true},v);
      if(kind==='ins'){o.cod='INS-'+String(S.seq.cod++).padStart(4,'0');o.id=`${me().clinic}-${o.cod}`;o.clinic=me().clinic}
      else o.id=uid(kind[0]);
      if(kind==='usr')S.prefs[o.id]=defPrefs();
      list.push(o);aud('Criação',label,`${o.nome}${kind==='ins'?' ('+o.cod+')':''} cadastrado`,kind==='ins'?o.clinic:me().clinic);
      if(kind==='ins')toast(`Código gerado: ${o.cod}`)}
    commit(`${label[0].toUpperCase()+label.slice(1)} salvo.`);return null},{wide:kind==='ins',extra:kind==='usr'&&!cur?'<p class="small muted" style="margin-top:10px">Neste protótipo, novos usuários recebem a senha de demonstração <b>demo123</b>. Na versão real, a senha é definida pelo usuário e armazenada com hash + salt.</p>':''})}
function toggle(kind,id){const list={ins:S.items,usr:S.users,pk:S.packages}[kind];const x=list.find(y=>y.id===id);x.ativo=!x.ativo;aud(x.ativo?'Reativação':'Inativação',kind,x.nome,x.clinic);commit(x.ativo?'Reativado.':'Inativado.')}
function custoModal(id){const it=itemById(id);
  formModal(`Custo unitário — ${it.nome}`,[{k:'custo',l:`Custo unitário (R$ por ${it.un})`,t:'number',req:1,min:0,step:'0.01',def:it.custo||0,h:'Valor de referência usado no valor em estoque, nas saídas, nas perdas e nas notas de recebimento.'}],{custo:it.custo||0},v=>{
    if(v.custo==null||v.custo<0)return 'Informe um custo válido.';
    const old=custoU(it);it.custo=Math.round(v.custo*100)/100;aud('Edição','Custo unitário',`${it.nome}: ${brl(old)} → ${brl(it.custo)}`,it.clinic);commit('Custo atualizado.');return null})}
function catModal(id){
  const cl=me().clinic,cur=id&&S.cats[cl].find(c=>c.id===id);
  formModal(cur?'Renomear categoria':'Nova categoria',[{k:'nome',l:'Nome da categoria',req:1,full:1,def:cur?cur.nome:''}],cur?{nome:cur.nome}:null,v=>{
    const n=(v.nome||'').trim();if(!n)return 'Informe o nome.';
    if(S.cats[cl].some(c=>c.nome.toLowerCase()===n.toLowerCase()&&c.id!==id))return 'Já existe uma categoria com este nome nesta clínica.';
    if(cur){const old=cur.nome;cur.nome=n;S.items.forEach(i=>{if(i.clinic===cl&&i.cat===old)i.cat=n});aud('Edição','Categoria',`${old} → ${n}`)}
    else{S.cats[cl].push({id:cl+'k'+uid('').slice(-5),nome:n,ativo:true});aud('Criação','Categoria',n)}
    commit('Categoria salva.');return null})}
function pkModal(id){
  const cur=id&&S.packages.find(p=>p.id===id);const its=myItems();
  const row=(r={})=>`<div class="fg" style="grid-template-columns:2fr 1fr auto;align-items:end;margin-bottom:8px" data-row><label class="f"><span>Insumo</span><select name="pi">${selOpts(its.map(i=>[i.id,`${i.cod} · ${i.nome}`]),r.item,'Selecione…')}</select></label><label class="f"><span>Qtd padrão</span><input type="number" name="pq" min="0" step="any" value="${esc(r.qtd??1)}"></label><button type="button" class="ib" data-act="pk-delrow" aria-label="Remover insumo">${ico('x',18)}</button></div>`;
  const fid=uid('fm');
  FORMS[fid]=(form)=>{const nome=form.elements.nome.value.trim(),grupo=form.elements.grupo.value.trim();
    const items=[...form.querySelectorAll('[data-row]')].map(r=>({item:r.querySelector('[name=pi]').value,qtd:+r.querySelector('[name=pq]').value})).filter(x=>x.item&&x.qtd>0);
    const err=(m)=>{let b=$('.err',form);if(!b){b=document.createElement('div');b.className='err';form.querySelector('.mf').before(b)}b.textContent=m};
    if(!nome||!grupo)return err('Informe nome e grupo de material.');if(!items.length)return err('Adicione ao menos um insumo com quantidade.');
    if(cur){Object.assign(cur,{nome,grupo,itens:items});aud('Edição','Pacote',nome,cur.clinic)}else{S.packages.push({id:uid('p'),clinic:me().clinic,nome,grupo,ativo:true,itens:items});aud('Criação','Pacote',nome)}
    closeModal();commit('Pacote salvo.')};
  modal(cur?'Editar pacote':'Novo pacote',`<form data-form="${fid}"><div class="fg"><label class="f"><span>Nome do pacote<b class="rq" aria-hidden="true"> *</b></span><input name="nome" required value="${esc(cur?cur.nome:'')}"></label><label class="f"><span>Grupo de material<b class="rq" aria-hidden="true"> *</b></span><input name="grupo" required value="${esc(cur?cur.grupo:'')}"></label></div>
   <h3 style="margin:14px 0 8px">Insumos e quantidades padrão consumidas</h3><div id="pk-rows">${(cur?cur.itens:[{}]).map(row).join('')}</div>
   <template id="pk-tpl">${row()}</template><button type="button" class="btn sec sm" data-act="pk-addrow">${ico('plus',16)}Adicionar insumo</button>
   <div class="mf"><button type="button" class="btn sec" data-act="mclose">Cancelar</button><button class="btn" type="submit">Salvar pacote</button></div></form>`,true)}

/* =====================================================================
   CONFIGURAÇÕES
   ===================================================================== */
function vConf(){
  if(!can('config'))return noPerm();
  const edit=isSuper();
  let h=pageHead('Configurações',`Permissões por perfil e parâmetros de cálculo e de alerta.${edit?'':' (somente leitura para o seu perfil)'}`);
  const P=(k,l,help,min,max)=>`<label class="f"><span>${l}</span><input type="number" min="${min}" max="${max}" value="${S.cfg[k]}" data-act="cfg" data-k="${k}" ${edit?'':'disabled'}><small>${help}</small></label>`;
  h+=`<div class="card"><div class="chd"><h2>Matriz de permissões por perfil</h2></div>
   ${table(['Permissão',...Object.values(PERFIS)],PERMS.map(p=>`<tr><td>${p[1]}</td>${Object.keys(PERFIS).map(r=>`<td><label class="sw"><input type="checkbox" data-act="perm" data-r="${r}" data-p="${p[0]}" ${S.perms[r][p[0]]?'checked':''} ${edit?'':'disabled'} aria-label="${esc(p[1])} — ${PERFIS[r]}"><span></span></label></td>`).join('')}</tr>`))}
   <p class="small muted" style="margin-top:8px">As alterações valem imediatamente: troque de perfil (sair → entrar) para ver o menu e as ações mudarem. Isolamento entre clínicas é sempre aplicado.</p></div>`;
  h+=`<div class="grid g2 mt"><div class="card"><h2>Parâmetros de cálculo e de alerta</h2><div class="fg" style="grid-template-columns:1fr">
   ${P('margem','Margem de segurança do nível crítico (%)','O nível crítico (0 a 10) compara os dias de cobertura com o tempo de reposição × (1 + margem). A partir de 7, o item é crítico.',0,200)}
   ${P('limiteBaixa','Retirada considerada alta (× a média diária)','Alerta ao Administrador quando uma retirada passa deste múltiplo (mínimo de 1 unidade).',1,20)}
   ${P('quedaConsumo','Queda de consumo que gera alerta (%)','Compara a média dos últimos 14 dias com a média aprendida (dias 15 a 90).',10,95)}
   ${P('prazoAbandono','Prazo para produto recebido incorreto (dias)','Contado da notificação à empresa. Depois dele, o produto pode ser incorporado ou descartado.',1,365)}</div>
   <p class="small muted" style="margin-top:8px">A antecedência do alerta de validade é definida por insumo, em Cadastros → Insumos.</p></div>
   <div class="card"><h2>Dados da demonstração</h2><p class="muted" style="margin-bottom:12px">O protótipo guarda tudo apenas neste navegador. Reinicie para voltar ao cenário inicial (3 clínicas, itens em nível crítico, lotes a vencer e vencidos, recebimentos incorretos).</p><button class="btn dng" data-act="reset">Reiniciar demonstração</button></div></div>`;
  return h}

/* =====================================================================
   EVENTOS
   ===================================================================== */
const A={
 go(el){UI.fm=1;UI.page=el.dataset.p;window.scrollTo(0,0);render()},
 'go-ab'(){UI.page='entrada';UI.tabs.entrada='ab';render()},
 tab(el){UI.tabs[el.dataset.k]=el.dataset.v;render()},
 clinic(el){UI.clinic=el.value;render()},
 setclinic(el){UI.clinic=el.dataset.c;UI.page='estoque';render()},
 'est-sort'(el){const k=el.dataset.k,cur=estSort();setP(D,'est.sort',k);setP(D,'est.dir',cur.k===k&&cur.dir==='asc'?'desc':'asc');render()},
 'est-clear'(){const k=dv('est.sort','st'),d=dv('est.dir','asc');D.est={sort:k,dir:d};render()},
 'goto-est'(el){UI.clinic=el.dataset.c;UI.page='estoque';D.est={st:el.dataset.st};window.scrollTo(0,0);render()},
 reset(e){e&&e.preventDefault&&e.preventDefault();modal('Reiniciar demonstração',`<p>Os dados criados neste navegador (saídas, entradas, cadastros) serão apagados e o cenário inicial volta.</p><div class="mf"><button class="btn sec" data-act="mclose">Cancelar</button><button class="btn dng" data-act="reset-ok">Reiniciar</button></div>`)},
 'reset-ok'(){closeModal();try{localStorage.removeItem(LS)}catch(_){}const sess=S.session;S=seed();S.session=sess;D={};UI.page='painel';UI.clinic='all';UI.tabs={};save();render();toast('Demonstração reiniciada.')},
 simperfil(el){S.session=el.value;D={};UI.page='painel';UI.clinic='all';UI.limit=60;UI.tabs={};save();render()},
 mclose(){closeModal()},
 mbg(el,e){if(e.target===el)closeModal()},
 more(){UI.limit+=60;render()},
 lotes(el){lotesModal(el.dataset.id)},
 ajustar(el){ajustarModal(el.dataset.id)},
 'descartar-venc'(){
   const ex=expiring(myItems()).filter(x=>x.d<0);if(!ex.length){toast('Não há lotes vencidos com saldo.');return}
   modal('Descartar lotes vencidos',`<p>Os lotes abaixo serão baixados como <b>perda por validade</b> e deixarão de compor o saldo.</p>${table(['Item','Lote','Qtd','Venceu em'],ex.map(x=>`<tr><td>${esc(x.it.nome)}</td><td>${esc(x.l.lote)}</td><td class="num">${num(x.l.qtd)}</td><td>${valTag(x.l.val,x.it)}</td></tr>`))}<div class="mf"><button class="btn sec" data-act="mclose">Cancelar</button><button class="btn" data-act="descartar-ok">Confirmar descarte</button></div>`)},
 'descartar-ok'(){const ex=expiring(myItems()).filter(x=>x.d<0);let n=0;for(const x of ex){const r=doOut(x.it,x.l.qtd,'vencimento','Lote vencido descartado','manual',x.l.id);if(r.ok)n++}aud('Descarte','Estoque',`${n} lote(s) vencido(s) descartado(s)`);closeModal();commit(`${n} lote(s) vencido(s) descartado(s).`)},
 estornar(el){estornarModal(el.dataset.id)},
 'ent-add'(){D.ent.rows.push({});render()},
 'ent-del'(el){D.ent.rows.splice(+el.dataset.i,1);if(!D.ent.rows.length)D.ent.rows=[{}];render()},
 'ent-clear'(){D.ent=null;render()},
 'ent-origem'(el){const E=D.ent;E.origem=el.dataset.v;if(E.origem!=='doacao'&&E.origem!=='outro')E.texto='';if(E.origem==='doacao'){E.ped='';E.pedidoEm=''}render()},
 'ent-file-clear'(el){D.ent[el.dataset.k]='';render()},
 nota(el){notaModal(el.dataset.id)},
 'estorno-nota'(el){estornoNota(el.dataset.id)},
 'ab-new'(){abNew()},'ab-incorporar'(el){abIncorporar(el.dataset.id)},'ab-descartar'(el){abDescartar(el.dataset.id)},
 'ab-trocado'(el){const a=S.abandoned.find(x=>x.id===el.dataset.id);a.status='trocado';a.resolvidoEm=ymd(T0);aud('Troca','Recebimento incorreto',`${a.id} trocado pela empresa ${a.empresa}`);commit(`${a.id}: troca registrada.`)},
 'n-read'(el){const n=S.notifs.find(x=>x.id===el.dataset.id);n.lida=true;save();render()},
 'n-all'(){visibleNotifs().forEach(n=>n.lida=true);save();render()},
 'n-test'(){toast('Mensagem de teste enviada (simulado) para os canais ativos.')},
 pref(el){const u=me();S.prefs[u.id]=S.prefs[u.id]||defPrefs();S.prefs[u.id][el.dataset.t]=Object.assign({},prefOf(u,el.dataset.t),{[el.dataset.c]:el.checked?1:0});save();render()},
 'pref-resumo'(el){S.prefs[S.session].resumo=el.checked?1:0;save();render()},
 async exp(el){const src=el.dataset.src,fmt=el.dataset.fmt;let spec=null;
   if(src==='mov'){const r=filteredMoves();spec={name:'movimentacoes',title:EXPORT_TITLES.movimentacoes,meta:[`Período: ${fD(movRange().a)} a ${fD(movRange().b)}`],rows:[['Data/hora','Clínica','Usuário','Código','Insumo',...(budget()?['Valor (R$)']:['Lote','Quantidade']),'Categoria','Motivo','Destinatário','Devolvido por','Origem'],...r.map(m=>[fDT(m.ts),clinicName(m.clinic),userName(m.user),(itemById(m.item)||{}).cod,(itemById(m.item)||{}).nome,...(budget()?[(itemById(m.item)&&custoU(itemById(m.item))?(m.qtd>0?'+':'−')+brl(Math.abs(m.qtd)*custoU(itemById(m.item))):'—')]:[m.loteTxt,num(m.qtd)]),PILL[m.tipo][0],m.motivo,m.destinatario||'',m.pessoa?pessoaTxt(m.pessoa):'',m.origem])]}}
   else if(src==='rel'){if(EXPORT)spec={name:EXPORT.name,title:EXPORT.title||EXPORT_TITLES[EXPORT.name]||EXPORT.name,rows:EXPORT.rows,meta:[`Período: últimos ${dv('rel.dias',30)} dias`]}}
   else if(src==='nota'){const r=S.receipts.find(x=>x.id===el.dataset.id);spec={name:'nota-'+r.id,title:`Nota de recebimento ${r.id}`,meta:[`Origem: ${originLabel(r.origem)}`,`Data do pedido: ${fD(r.pedidoEm)} · Recebimento: ${fD(r.recebidoEm)}`,...(budget()?[`Valor total: ${brl(notaValor(r))}`]:[`Carta do doador: ${r.carta||'—'} · Comprovante: ${r.comprovante||'—'}`])],rows:[budget()?['Código','Insumo','Qtd recebida','Custo unit.','Total']:['Código','Insumo','Qtd recebida','Lote','Validade'],...r.rows.map(x=>{const it=itemById(x.item);return budget()?[it.cod,it.nome,num(x.rec)+' '+it.un,brl(custoU(it)),brl(x.rec*custoU(it))]:[it.cod,it.nome,num(x.rec)+' '+it.un,x.lote||'—',fD(x.val)]})]}}
   setBusy(el,true);try{await exportData(fmt,spec)}finally{setBusy(el,false)}},
 'cad-new'(el){({ins:()=>crud('ins'),cat:()=>catModal(),pk:()=>pkModal(),usr:()=>crud('usr'),cli:()=>crud('cli')})[el.dataset.t]()},
 'ins-new'(){crud('ins')},'ins-edit'(el){crud('ins',el.dataset.id)},'ins-toggle'(el){toggle('ins',el.dataset.id)},
 'usr-new'(){crud('usr')},'usr-edit'(el){crud('usr',el.dataset.id)},'usr-toggle'(el){toggle('usr',el.dataset.id)},
 'cli-new'(){crud('cli')},'cli-edit'(el){crud('cli',el.dataset.id)},
 'pk-new'(){pkModal()},'pk-edit'(el){pkModal(el.dataset.id)},'pk-toggle'(el){toggle('pk',el.dataset.id)},
 'pk-addrow'(){const t=$('#pk-tpl');$('#pk-rows').insertAdjacentHTML('beforeend',t.innerHTML)},
 'pk-delrow'(el){const rows=$('#pk-rows');if(rows.children.length>1)el.closest('[data-row]').remove()},
 'cat-new'(){catModal()},'cat-rename'(el){catModal(el.dataset.id)},
 'cat-toggle'(el){const cl=me().clinic,c=S.cats[cl].find(x=>x.id===el.dataset.id);
   if(c.ativo){const n=S.items.filter(i=>i.clinic===cl&&i.cat===c.nome&&i.ativo).length;if(n){toast(`Há ${n} insumo(s) ativo(s) nesta categoria. Mova-os para outra categoria antes de inativar.`,'e');return}}
   c.ativo=!c.ativo;aud(c.ativo?'Reativação':'Inativação','Categoria',c.nome);commit(c.ativo?'Categoria reativada.':'Categoria inativada.')},
 cfg(el){const k=el.dataset.k;const mn=+el.min,mx=+el.max;const v=Math.max(mn,Math.min(mx,+el.value||mn));S.cfg[k]=v;el.value=v;aud('Configuração','Parâmetro',`${k}: ${v}`,null);syncAlerts(S);save();toast('Parâmetro atualizado.')},
 'orc-toggle'(el){S.orcView=el.checked;save();render()},
 'nv-help'(){nvHelp()},
 net(el){UI.net=el.value;UI.okPages={};UI.loading=false;clearTimeout(LT);LASTP=null;render()},
 'net-retry'(){UI.okPages[UI.page]=1;startLoad(700)},
 'ins-custo'(el){custoModal(el.dataset.id)},
 perm(el){S.perms[el.dataset.r][el.dataset.p]=el.checked?1:0;aud('Configuração','Permissão',`${PERFIS[el.dataset.r]} · ${el.dataset.p}: ${el.checked?'concedida':'removida'}`,null);save();toast('Permissão atualizada.')},
};
const FORMH={
 'saida-manual'(f){const its=myItems();const it=findByCode(dv('sm.cod'),its);const bad=(m,k)=>formFail(f,m,k);
   if(!it)return bad('Informe um código de insumo válido.','sm.cod');
   const tipo=dv('sm.tipo','consumo');if(tipo!=='consumo'&&!can('saida'))return bad('Seu perfil registra apenas consumo.','sm.tipo');
   const qty=+dv('sm.qty');if(!(qty>0))return bad('Informe a quantidade.','sm.qty');
   const dest=(dv('sm.dest')||'').trim(),mot=(dv('sm.motivo')||'').trim();
   if(['emprestimo','doacao'].includes(tipo)&&!dest)return bad('Informe quem recebe.','sm.dest');
   if(tipo!=='consumo'&&!mot)return bad('Informe o motivo.','sm.motivo');
   const lots=tipo==='vencimento'?itemLots(it.id).filter(isExp):usable(it.id);const sug=lots[0];const pref=dv('sm.lot','')||(sug?sug.id:'');
   const ba=tipo!=='vencimento'?baixaAlta(it,qty):null;
   const r=doOut(it,qty,tipo,mot||'Atendimento','manual',pref,dest?{destinatario:dest}:undefined);
   if(r.err)return bad(r.err,'sm.qty');
   const warns=[];
   if(tipo!=='vencimento'&&sug&&pref&&pref!==sug.id){const ch=S.lots.find(l=>l.id===pref);
     pushNotif(S,{clinic:it.clinic,roles:['admin'],tipo:'lote',titulo:`Retirada fora da validade mais próxima: ${it.nome}`,texto:`${userName(S.session)} retirou ${num(qty)} ${it.un} do lote ${ch.lote} (validade ${fD(ch.val)}) em vez do lote ${sug.lote} (validade ${fD(sug.val)}), que vence antes.`,ref:it.id});
     warns.push('O Administrador foi avisado: o lote escolhido não é o de validade mais próxima.')}
   if(ba){pushNotif(S,{clinic:it.clinic,roles:['admin'],tipo:'baixa_alta',titulo:`Retirada acima da média: ${it.nome}`,texto:`${userName(S.session)} retirou ${num(qty)} ${it.un}, ${num(ba.ratio)}× a média diária de ${num(ba.cd)}/dia.`,ref:it.id});
     warns.push('O Administrador foi avisado: retirada acima da média diária.')}
   aud('Saída','Estoque',`${it.nome}: ${num(qty)} ${it.un} (${PILL[tipo][0]})${dest?' → '+dest:''}`);D.sm={};UI.focusSel='#sm-cod';
   commit(`Saída registrada: ${num(qty)} ${it.un} de ${it.nome}.`,undefined,{label:'Desfazer',fn:()=>undoOut(r.moves,it)});warns.forEach(w=>toast(w,'e'))},
 'saida-proc'(f){const p=myPk().find(x=>x.id===f.pkg.value),mult=+f.mult.value||1;const plan=p.itens.map(r=>{const it=itemById(r.item),def=Math.round(r.qtd*mult*100)/100;return{it,q:+dv('sp.q.'+r.item,def),def}});
   const adj=plan.some(x=>x.q!==x.def);const just=f.just?f.just.value.trim():'';
   if(adj&&just.length<5)return formFail(f,'Informe a justificativa do ajuste (mínimo de 5 caracteres).','just');
   for(const x of plan){if(x.q>0&&saldoUtil(x.it.id)<x.q)return formFail(f,`Saldo insuficiente de "${x.it.nome}": disponível ${num(saldoUtil(x.it.id))} ${x.it.un}.`,'sp.q.'+x.it.id)}
   for(const x of plan){if(x.q>0)doOut(x.it,x.q,'consumo',adj?`Ajuste: ${just}`:p.nome,'pacote:'+p.nome)}
   aud('Saída','Pacote de insumos',`${p.nome} ×${mult}${adj?' (quantidades ajustadas: '+just+')':''}`);D.sp={};commit(`Baixa do pacote "${p.nome}" registrada.`)},
 'saida-dev'(f){const its=myItems();const it=findByCode(dv('dv.cod'),its);const bad=(m,k)=>formFail(f,m,k);
   if(!it)return bad('Informe um código de insumo válido.','dv.cod');const qty=+dv('dv.qty');if(!(qty>0))return bad('Informe a quantidade devolvida.','dv.qty');
   const pes=(dv('dv.pessoa')||'').trim();if(pes.length<2)return bad('Informe o nome de quem retirou e devolveu.','dv.pessoa');
   const ls=dv('dv.lot','');let lote,val;
   if(ls==='__new'||!S.lots.some(l=>l.item===it.id)){lote=it.lote?(dv('dv.lote')||'').trim():'—';val=it.lote?dv('dv.val'):null;if(it.lote&&(!lote||!val))return bad('Informe lote e validade.')}
   else{const l=S.lots.find(x=>x.id===ls);if(!l)return bad('Selecione o lote.','dv.lot');lote=l.lote;val=l.val}
   const lot=addLot(it,lote,val,qty);
   mv({item:it.id,clinic:it.clinic,lot:lot.id,loteTxt:lot.lote,qtd:qty,tipo:'devolucao',motivo:(dv('dv.obs')||'').trim()||'Item retirado e não utilizado',origem:'devolução',pessoa:pes});
   aud('Devolução','Estoque',`${it.nome}: ${num(qty)} ${it.un} devolvidos por ${pes} (lote ${lot.lote})`);D.dv={};
   UI.focusSel='#dv-cod';commit(`Devolução registrada: ${num(qty)} ${it.un} de ${it.nome}.`);
   modal('Devolução registrada',`<table class="t"><tbody><tr><td><b>Código do insumo</b></td><td>${esc(it.cod)} — ${esc(it.nome)}</td></tr><tr><td><b>Quantidade devolvida</b></td><td>${num(qty)} ${esc(it.un)}</td></tr><tr><td><b>Lote</b></td><td>${esc(lot.lote)}</td></tr><tr><td><b>Validade</b></td><td>${fD(lot.val)}</td></tr><tr><td><b>Retirado e devolvido por</b></td><td>${esc(pes)}</td></tr></tbody></table><div class="mf"><button class="btn" data-act="mclose">Fechar</button></div>`)},
 entrada(f){const E=D.ent;const bad=(m,k)=>formFail(f,m,k);const its=myItems();
   const o=E.origem;if(o==='clinica'&&!E.clinica)return bad('Escolha a clínica de origem.','ent.clinica');if(o==='outro'&&!(E.texto||'').trim())return bad('Descreva a origem.','ent.texto');
   if(o==='doacao'&&!E.carta)return bad('Anexe a carta do doador.','ent.carta');
   if(!E.recebidoEm||parseD(E.recebidoEm)>T0)return bad('Informe a data do recebimento (não pode ser futura).','ent.recebidoEm');
   if(o!=='doacao'&&E.pedidoEm&&parseD(E.pedidoEm)>parseD(E.recebidoEm))return bad('A data do pedido não pode ser posterior ao recebimento.','ent.pedidoEm');
   const rows=E.rows.filter(r=>r.cod||r.rec);if(!rows.length)return bad('Adicione ao menos um insumo.','ent.rows.0.cod');
   for(const r of rows){const ix=E.rows.indexOf(r);const it=findByCode(r.cod,its);if(!it)return bad(`Código "${r.cod||''}" não encontrado nesta clínica.`,`ent.rows.${ix}.cod`);if(!(+r.rec>0))return bad(`Informe a quantidade recebida de "${it.nome}".`,`ent.rows.${ix}.rec`);if(it.lote&&(!r.lote||!r.val))return bad(`"${it.nome}" controla lote: informe lote e validade.`,`ent.rows.${ix}.${r.lote?'val':'lote'}`)}
   const nid='NR-'+String(S.seq.nr++).padStart(4,'0');const origem={tipo:o,clinica:o==='clinica'?E.clinica:null,texto:(o==='doacao'||o==='outro')?(E.texto||'').trim():''};
   const rec={id:nid,ts:nowISO(),clinic:me().clinic,user:S.session,origem,carta:o==='doacao'?E.carta:null,comprovante:E.comprovante||null,pedidoEm:o==='doacao'?null:(E.pedidoEm||null),recebidoEm:E.recebidoEm,rows:[],estornada:false};
   for(const r of rows){const it=findByCode(r.cod,its);const lot=addLot(it,r.lote,r.val||null,+r.rec);mv({item:it.id,clinic:it.clinic,lot:lot.id,loteTxt:lot.lote,qtd:+r.rec,tipo:'entrada',motivo:`Entrada — ${originLabel(origem)}`,origem:'nota:'+nid});
     rec.rows.push({item:it.id,ped:r.ped!=null?+r.ped:null,rec:+r.rec,lote:lot.lote,val:lot.val,lot:lot.id})}
   S.receipts.push(rec);if(E.ped){const p=S.requests.find(x=>x.id===E.ped);if(p)p.atendido=true}
   aud('Entrada','Nota de recebimento',`${nid} · ${originLabel(origem)} · ${rec.rows.length} item(ns)`);D.ent=null;UI.tabs.entrada='notas';commit(`Entrada registrada — nota ${nid} emitida.`);notaModal(nid)},
};

/* =====================================================================
   MONTAGEM  (chamada pelo componente React App)
   ===================================================================== */
const SEL_CHANGE=['clinic','cfg','perm','pref','pref-resumo','orc-toggle','simperfil','net'];
function tipShow(e){const t=e.target.closest&&e.target.closest('[data-tip]');if(!t||!ROOT)return;const tip=$('#est-tip');tip.textContent=t.dataset.tip;tip.hidden=false;const r=t.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';tip.style.top=(r.top-h-8<8?r.bottom+8:r.top-h-8)+'px'}
function tipHide(){const tip=ROOT&&$('#est-tip');if(tip)tip.hidden=true}
function onToggle(e){if(e.target.classList&&e.target.classList.contains('sim'))UI.simOpen=e.target.open}
function onClick(e){if(e.target.closest('[data-tip]'))tipShow(e);else tipHide();const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;if(SEL_CHANGE.includes(a)&&el.tagName!=='BUTTON')return;if(el.tagName==='A')e.preventDefault();if(A[a])A[a](el,e)}
function onChange(e){const el=e.target;
  if(el.dataset.act&&SEL_CHANGE.includes(el.dataset.act)){A[el.dataset.act](el,e);return}
  if(el.dataset.file){setP(D,el.dataset.file,el.files&&el.files[0]?el.files[0].name:'');render();return}
  if(el.name&&el.type==='checkbox'&&el.closest('form[data-form]')){el.closest('form').querySelectorAll(`[data-showif="${el.name}"]`).forEach(x=>x.classList.toggle('hide',!el.checked))}
  if(el.dataset.d&&!el.dataset.act){const v=el.type==='checkbox'?el.checked:el.value;setP(D,el.dataset.d,v);if(el.dataset.clear)setP(D,el.dataset.clear,{});if(el.dataset.cb&&CB[el.dataset.cb])CB[el.dataset.cb](v,el);if(el.dataset.r&&el.dataset.r!=='live')render()}}
function clearFieldErr(el){if(el.getAttribute&&el.getAttribute('aria-invalid')){const p=document.getElementById(el.getAttribute('aria-describedby'));const rw=p&&p.closest('tr.rowerr');if(p)p.remove();if(rw)rw.remove();el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby')}}
function onInput(e){const el=e.target;clearFieldErr(el);if(el.dataset.d&&!el.dataset.act){setP(D,el.dataset.d,el.type==='checkbox'?el.checked:el.value);if(el.dataset.r==='live')render()}}
function onSubmit(e){const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();if(f.querySelector('button[aria-busy]'))return;if(!validateRequired(f))return;
  const k=f.dataset.form;const run=()=>{if(FORMH[k])FORMH[k](f);else if(FORMS[k])FORMS[k](f)};
  if(UI.net==='ok'){run();return}
  const b=f.querySelector('button[type=submit]');setBusy(b,true);
  setTimeout(()=>{if(!ROOT||!f.isConnected)return;if(UI.net==='fail'){setBusy(b,false);clearErrs(f);formBanner(f,'Sem conexão com o servidor (simulado). Seus dados continuam preenchidos; tente de novo.');return}run()},900)}
function onKeydown(e){
  if(e.key==='Tab'&&$('#est-modal').innerHTML){const m=$('#est-modal .modal');const f=[...m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);if(f.length){const first=f[0],last=f[f.length-1],ac=document.activeElement;if(e.shiftKey&&(ac===first||ac===m)){e.preventDefault();last.focus()}else if(!e.shiftKey&&ac===last){e.preventDefault();first.focus()}}}
  if(e.target.getAttribute&&e.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){const ts=[...e.target.parentElement.querySelectorAll('[role=tab]')],i=ts.indexOf(e.target);const n=e.key==='Home'?0:e.key==='End'?ts.length-1:(i+(e.key==='ArrowRight'?1:-1)+ts.length)%ts.length;e.preventDefault();ts[n].focus();ts[n].click()}
  if(e.key==='Escape')tipHide();
  if(e.key==='Escape'&&$('#est-modal').innerHTML)closeModal();
  if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.enter){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}))}}

/**
 * Monta o módulo dentro de `root`.
 * @param {HTMLElement} root  elemento que recebe o módulo (já com a classe est-root)
 * @param {{standalone?:boolean}} host  standalone = executando fora do shell (sem /supplies na URL)
 * @returns {{unmount:()=>void}}
 */
let CURRENT=null;
export function mount(root,host={}){
  // Raiz fora do documento (árvore descartada pelo React): ignora, para não tomar o lugar da instância ativa.
  if(!root||!root.isConnected)return {unmount(){}};
  if(CURRENT)CURRENT.unmount(); // uma instância por vez: o estado do motor é único
  ROOT=root;HOST={standalone:!!host.standalone};lastPath=null;if(!document.title.endsWith(TITLE_SUFFIX))TITLE0=document.title;
  root.innerHTML='<div id="est-app"></div><div id="est-modal"></div><div id="est-toasts" aria-live="polite"></div><div id="est-tip" role="tooltip" hidden></div>';LASTP=null;UI.loading=false;
  S=load()||seed();if(!me()||!me().ativo)S.session=DEFAULT_USER;
  D={};UI.clinic='all';UI.tabs={};UI.limit=60;UI.fm=0;
  const first=pageFromPath(location.pathname);UI.page=first||'painel';
  root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('input',onInput);
  root.addEventListener('submit',onSubmit);root.addEventListener('keydown',onKeydown);
  root.addEventListener('mouseover',tipShow);root.addEventListener('mouseout',tipHide);root.addEventListener('focusin',tipShow);root.addEventListener('focusout',tipHide);root.addEventListener('toggle',onToggle,true);
  window.addEventListener('shell-navigated',onShellNav);
  syncAlerts(S);save();render();
  const handle={unmount(){
    if(handle.dead)return;handle.dead=true;
    root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('input',onInput);
    root.removeEventListener('submit',onSubmit);root.removeEventListener('keydown',onKeydown);
    root.removeEventListener('mouseover',tipShow);root.removeEventListener('mouseout',tipHide);root.removeEventListener('focusin',tipShow);root.removeEventListener('focusout',tipHide);root.removeEventListener('toggle',onToggle,true);clearTimeout(LT);
    window.removeEventListener('shell-navigated',onShellNav);
    root.innerHTML='';
    if(CURRENT===handle){CURRENT=null;ROOT=null;document.title=TITLE0}}};
  CURRENT=handle;return handle;
}


