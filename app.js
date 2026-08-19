const SAVE_KEY='investigador-save-v4';
let story=null;
let state=null;
let creator={profession:null,talents:[],motivation:null};
let currentChoiceTime=0;

const $=s=>document.querySelector(s);
const screens={home:$('#home'),creator:$('#creator'),game:$('#game')};

function showScreen(name){
  Object.entries(screens).forEach(([k,el])=>el.classList.toggle('active',k===name));
}
function fmtTime(minutes){
  const h=Math.floor((minutes%1440)/60).toString().padStart(2,'0');
  const m=(minutes%60).toString().padStart(2,'0');
  return `${h}:${m}`;
}
function save(){ localStorage.setItem(SAVE_KEY,JSON.stringify(state)); updateContinue(); }
function loadSave(){ try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch{return null} }
function updateContinue(){ $('#continueBtn').classList.toggle('hidden',!loadSave()); }

async function loadStory(){
  const res=await fetch('./adventures/la-senal/story.json');
  story=await res.json();
}

const randomNames=[
  'Arthur Bennett','Eleanor Hayes','Samuel Whitmore','Margaret Doyle','Henry Caldwell',
  'Clara Mercer','Walter Reed','Alice Harrow','Thomas Blackwood','Edith Crane'
];

function startCreator(){
  creator={profession:null,talents:[],motivation:null};
  $('#charName').value='';
  renderCreator();
  showScreen('creator');
}
function renderCreator(){
  const cc=story.characterCreation;
  const profBox=$('#professionList');
  profBox.innerHTML='';
  cc.professions.forEach(p=>{
    const b=document.createElement('button');
    b.className='select-option'+(creator.profession===p.id?' selected':'');
    b.innerHTML=`<strong>${p.name}</strong><small>${p.description}</small>`;
    b.onclick=()=>{creator.profession=p.id;renderCreator()};
    profBox.appendChild(b);
  });

  const talentBox=$('#talentList');
  talentBox.innerHTML='';
  cc.talents.forEach(t=>{
    const selected=creator.talents.includes(t.id);
    const b=document.createElement('button');
    b.className='select-option'+(selected?' selected':'');
    b.innerHTML=`<strong>${t.name}</strong><small>${t.description}</small>`;
    b.onclick=()=>{
      if(selected) creator.talents=creator.talents.filter(x=>x!==t.id);
      else if(creator.talents.length<2) creator.talents.push(t.id);
      renderCreator();
    };
    talentBox.appendChild(b);
  });

  const motBox=$('#motivationList');
  motBox.innerHTML='';
  cc.motivations.forEach(m=>{
    const b=document.createElement('button');
    b.className='select-option'+(creator.motivation===m?' selected':'');
    b.textContent=m;
    b.onclick=()=>{creator.motivation=m;renderCreator()};
    motBox.appendChild(b);
  });

  renderCreatorSummary();
}

function buildCharacterPreview(){
  const cc=story.characterCreation;
  const p=cc.professions.find(x=>x.id===creator.profession);
  if(!p) return null;
  const skills=structuredClone(p.skills);
  let health=p.health, sanity=p.sanity;
  creator.talents.forEach(id=>{
    const t=cc.talents.find(x=>x.id===id);
    if(!t)return;
    if(t.skill) skills[t.skill]=Math.min(90,(skills[t.skill]||20)+(t.bonus||0));
    health+=t.health||0;
    sanity+=t.sanity||0;
  });
  return {profession:p.name,skills,health,sanity};
}
function renderCreatorSummary(){
  const preview=buildCharacterPreview();
  const name=$('#charName').value.trim();
  const ready=!!name && !!creator.profession && creator.talents.length===2 && !!creator.motivation;
  $('#startAdventureBtn').disabled=!ready;
  if(!preview){
    $('#creatorSummary').innerHTML='Elige una profesión para ver tu ficha.';
    return;
  }
  $('#creatorSummary').innerHTML=`
    <strong>${name||'Investigador sin nombre'}</strong> · ${preview.profession}<br>
    Salud ${preview.health} · Cordura ${preview.sanity}
    <div class="skills">${Object.entries(preview.skills).map(([k,v])=>`<span>${k}: <strong>${v}</strong></span>`).join('')}</div>
  `;
}
function createCharacterAndStart(){
  const name=$('#charName').value.trim();
  const preview=buildCharacterPreview();
  if(!name || !preview || creator.talents.length!==2 || !creator.motivation)return;
  state=structuredClone(story.initialState);
  state.character={
    name,
    profession:preview.profession,
    talents:creator.talents.map(id=>story.characterCreation.talents.find(x=>x.id===id).name),
    motivation:creator.motivation,
    skills:preview.skills
  };
  state.health=preview.health;
  state.sanity=preview.sanity;
  save();
  showScreen('game');
  render();
}

function enterScene(id, addTime=0){
  state.scene=id;
  state.timeMinutes+=addTime||0;
  state.visited=state.visited||[];
  const sc=story.scenes[id];
  const firstVisit=!state.visited.includes(id);
  if(firstVisit){
    applyEffects(sc.onEnter);
    state.visited.push(id);
  }
  if(!state.log.includes(sc.title)) state.log.unshift(sc.title);
  save();
  render();
}
function applyEffects(effects){
  if(!effects)return;
  if(effects.addClue && !state.clues.includes(effects.addClue)) state.clues.push(effects.addClue);
  if(effects.addItem && !state.inventory.includes(effects.addItem)) state.inventory.push(effects.addItem);
  if(effects.sanity) state.sanity=Math.max(0,state.sanity+effects.sanity);
  if(effects.health) state.health=Math.max(0,state.health+effects.health);
  if(effects.setFlag) state.flags[effects.setFlag[0]]=effects.setFlag[1];
}
function hasRequirement(choice){
  if(choice.requiresClue && !state.clues.includes(choice.requiresClue)) return false;
  if(choice.requiresItem && !state.inventory.includes(choice.requiresItem)) return false;
  if(choice.requiresProfession && state.character?.profession!==choice.requiresProfession) return false;
  if(choice.requiresMotivation && state.character?.motivation!==choice.requiresMotivation) return false;
  if(choice.requiresFlag && !state.flags?.[choice.requiresFlag]) return false;
  return true;
}
function rollSkill(skill){
  const chance=state.character?.skills?.[skill.name] ?? 40;
  const roll=Math.floor(Math.random()*100)+1;
  const success=roll<=chance;
  $('#rollResult').innerHTML=`<strong>${success?'ÉXITO':'FALLO'}</strong><br>${skill.name}: ${roll} / ${chance}`;
  $('#rollResult').classList.remove('hidden');
  setTimeout(()=>enterScene(success?skill.success:skill.fail,0),1800);
}

function render(){
  const sc=story.scenes[state.scene];
  $('#locationLabel').textContent=sc.kicker||'EXPEDIENTE';
  $('#timeLabel').textContent=fmtTime(state.timeMinutes);
  $('#sanityLabel').textContent=state.sanity;
  $('#healthLabel').textContent=state.health;
  $('#cluesLabel').textContent=state.clues.length;
  $('#sceneKicker').textContent=sc.kicker||'';
  $('#sceneTitle').textContent=sc.title;
  $('#sceneText').innerHTML=sc.text.map(p=>`<p>${p}</p>`).join('');
  $('#rollResult').classList.add('hidden');
  const box=$('#choices'); box.innerHTML='';
  sc.choices.filter(hasRequirement).forEach(ch=>{
    const b=document.createElement('button');
    b.className='choice-btn';
    const exclusive=ch.requiresProfession?` · ${ch.requiresProfession}`:(ch.requiresMotivation?` · ${ch.requiresMotivation}`:'');
    if(ch.skill){
      const chance=state.character?.skills?.[ch.skill.name] ?? 40;
      b.textContent=`${ch.text} · ${ch.skill.name} ${chance}%${exclusive}`;
    }else b.textContent=`${ch.text}${exclusive}`;
    b.onclick=()=>{
      currentChoiceTime=ch.time||0;
      if(ch.action==='home'){save();showScreen('home');return;}
      if(ch.skill){
        state.timeMinutes+=currentChoiceTime;
        save();
        rollSkill(ch.skill);
      }else enterScene(ch.to,currentChoiceTime);
    };
    box.appendChild(b);
  });
}
function renderJournal(){
  const c=state.character;
  $('#characterSheet').innerHTML=c?`
    <strong>${c.name}</strong><br>
    ${c.profession}<br>
    <small>Motivación: ${c.motivation}</small><br>
    <small>Talentos: ${c.talents.join(' · ')}</small>
    <div class="skills">${Object.entries(c.skills).map(([k,v])=>`<span>${k}: <strong>${v}</strong></span>`).join('')}</div>
  `:'Sin investigador';
  $('#inventoryList').innerHTML=state.inventory.length?state.inventory.map(x=>`<li>${x}</li>`).join(''):'<li>Vacío</li>';
  $('#clueList').innerHTML=state.clues.length?state.clues.map(x=>`<li>${x}</li>`).join(''):'<li>Ninguna pista todavía</li>';
  $('#logList').innerHTML=state.log.slice(0,12).map(x=>`<li>${x}</li>`).join('');
}
function continueGame(){
  state=loadSave();
  if(!state || !state.character)return startCreator();
  state.visited=state.visited||[];
  state.flags=state.flags||{};
  showScreen('game');render();
}

$('#newGameBtn').onclick=startCreator;
$('#continueBtn').onclick=continueGame;
$('#cancelCreatorBtn').onclick=()=>showScreen('home');
$('#randomNameBtn').onclick=()=>{
  $('#charName').value=randomNames[Math.floor(Math.random()*randomNames.length)];
  renderCreatorSummary();
};
$('#charName').addEventListener('input',renderCreatorSummary);
$('#startAdventureBtn').onclick=createCharacterAndStart;
$('#homeBtn').onclick=()=>{save();showScreen('home')};
$('#journalBtn').onclick=()=>{renderJournal();$('#journalDialog').showModal()};
$('#closeJournalBtn').onclick=()=>$('#journalDialog').close();
$('#resetBtn').onclick=()=>{localStorage.removeItem(SAVE_KEY);$('#journalDialog').close();updateContinue();showScreen('home')};

(async()=>{
  await loadStory();
  updateContinue();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
