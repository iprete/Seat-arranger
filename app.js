// app.js

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

function parseList(str){ if(!str)return[]; return str.split(',') .map(x=>x.trim()) .filter(x=>x!==''); }

function hasDup(arr){ return new Set(arr).size!==arr.length; }

function pmxCrossover(parent1,parent2){ const size=parent1.length; let child=new Array(size).fill(null); let start=Math.floor(Math.random()*size); let end=Math.floor(Math.random()*size); if(start>end)[start,end]=[end,start]; for(let i=start;i<=end;i++){ child[i]=parent1[i]; } for(let i=start;i<=end;i++){ const gene=parent2[i]; if(!child.includes(gene)){ let pos=i; while(true){ const geneFromP1=parent1[pos]; const pos2=parent2.indexOf(geneFromP1); if(child[pos2]===null){ child[pos2]=gene; break; } else { pos=pos2; } } } } for(let i=0;i<size;i++){ if(child[i]===null){ child[i]=parent2[i]; } } return child; }

function swapMutation(arr){ const size=arr.length; let i1=Math.floor(Math.random()*size); let i2=Math.floor(Math.random()*size); while(i1===i2){ i2=Math.floor(Math.random()*size); } [arr[i1],arr[i2]]=[arr[i2],arr[i1]]; }

function arrayToMapping(arr,seats){ const mapping={}; for(let i=0;i<arr.length;i++){ mapping[seats[i].id]=arr[i]; } return mapping; }

const app={ seatMatrix:[], excludedSeats:new Set(), tdElements:{},

init(){ this.seatMatrix=[]; this.excludedSeats.clear(); this.tdElements={};

document.getElementById('gridArea').innerHTML='';
document.getElementById('scoreArea').textContent='';

const chk=this.checkInputs();
if(!chk.ok){
  alert(chk.msg);
  return;
}

const {numPeople,numRows}=chk;
let seatsPerRow=[];
const base=Math.floor(numPeople/numRows);
const rem=numPeople%numRows;
for(let i=0;i<numRows;i++){
  seatsPerRow.push(i<rem?base+1:base);
}

const maxCols=Math.max(...seatsPerRow);
let html='<table>';
html+=`<tr><td class="desk-td" colspan="${maxCols}">교탁</td></tr>`;
for(let r=0;r<numRows;r++){
  html+='<tr>';
  let rowArr=[];
  for(let c=0;c<seatsPerRow[r];c++){
    const cellId=`r${r}c${c}`;
    rowArr.push(cellId);
    html+=`<td id="${cellId}">-</td>`;
  }
  this.seatMatrix.push(rowArr);
  html+='</tr>';
}
html+='</table>';
document.getElementById('gridArea').innerHTML=html;

for(let r=0;r<this.seatMatrix.length;r++){
  for(let c=0;c<this.seatMatrix[r].length;c++){
    const cid=this.seatMatrix[r][c];
    const td=document.getElementById(cid);
    if(td){
      td.onclick=()=>this.toggleSeat(cid);
      this.tdElements[cid]=td;
    }
  }
}

},

toggleSeat(cellId){ if(!this.tdElements[cellId])return; if(this.excludedSeats.has(cellId)){ this.excludedSeats.delete(cellId); this.tdElements[cellId].classList.remove('excluded'); } else { this.excludedSeats.add(cellId); this.tdElements[cellId].classList.add('excluded'); } },

assignSeatsAdvanced(){ const chk=this.checkInputs(); if(!chk.ok){ alert(chk.msg); return; } if(!this.seatMatrix.length){ alert('먼저 [좌석 생성하기] 버튼을 눌러주세요.'); return; } const {numPeople,frontArr,backArr,notGroups,popSize,generations}=chk;

let availableSeats=[];
for(let r=0;r<this.seatMatrix.length;r++){
  for(let c=0;c<this.seatMatrix[r].length;c++){
    const cid=this.seatMatrix[r][c];
    if(!this.excludedSeats.has(cid)){
      availableSeats.push({row:r,col:c,id:cid});
    }
  }
}
if(availableSeats.length<numPeople){
  alert('사용 가능한 자리보다 인원이 많습니다!');
  return;
}
availableSeats.sort((a,b)=>(a.row-b.row)||(a.col-b.col));
const seats=availableSeats.slice(0,numPeople);

const startTime=performance.now();
const peopleArr=Array.from({length:numPeople},(_,i)=>(i+1).toString());

let population=[];
for(let i=0;i<popSize;i++){
  let perm=[...peopleArr];
  shuffle(perm);
  let mapping=arrayToMapping(perm,seats);
  population.push({mapping,fitness:0,perm});
}

for(let g=0;g<generations;g++){
  for(let p of population){
    p.fitness=this.calculateFitness(p.mapping,seats,frontArr,backArr,notGroups);
  }
  population.sort((a,b)=>b.fitness-a.fitness);
  const eliteCount=Math.floor(popSize*0.2);
  const newPop=population.slice(0,eliteCount);
  while(newPop.length<popSize){
    const parent1=this.tournamentSelection(population);
    const parent2=this.tournamentSelection(population);
    const childPerm=pmxCrossover(parent1.perm,parent2.perm);
    if(Math.random()<0.2){swapMutation(childPerm);}
    const childMapping=arrayToMapping(childPerm,seats);
    newPop.push({mapping:childMapping,fitness:0,perm:childPerm});
  }
  population=newPop;
}

population.sort((a,b)=>b.fitness-a.fitness);
const best=population[0];

for(let s of seats){
  const pid=best.mapping[s.id];
  this.tdElements[s.id].textContent=pid||'-';
}

const ratio=this.computeSatisfaction(best.mapping,seats,notGroups);
const endTime=performance.now();
const sec=((endTime-startTime)/1000).toFixed(2);
document.getElementById('scoreArea').textContent=`조건이행률: ${ratio.toFixed(2)}%, 처리시간: ${sec}초`;

},

tournamentSelection(population){ const tournamentSize=3; let best=null; for(let i=0;i<tournamentSize;i++){ const candidate=population[Math.floor(Math.random()*population.length)]; if(!best||candidate.fitness>best.fitness){ best=candidate; } } return best; },

calculateFitness(mapping,seats,frontArr,backArr,notGroups){ let sc=0; for(let group of notGroups){ for(let i=0;i<group.length;i++){ for(let j=i+1;j<group.length;j++){ let p1=group[i],p2=group[j]; let s1=null,s2=null; for(let s of seats){ if(mapping[s.id]===p1)s1=s; if(mapping[s.id]===p2)s2=s; if(s1&&s2)break; } if(s1&&s2){ let d=Math.abs(s1.row-s2.row)+Math.abs(s1.col-s2.col); sc+=d10; } } } } for(let s of seats){ const pid=mapping[s.id]; if(!pid)continue; if(frontArr.includes(pid)){ if(s.row<3){ sc+=(5-s.row); } else { sc-=10(s.row-2); } } if(backArr.includes(pid)){ sc+=(s.row*2); } } return sc; },

computeSatisfaction(mapping,seats,notGroups){ if(!notGroups.length)return 100; const rowMax=this.seatMatrix.length; const colMax=Math.max(...this.seatMatrix.map(row=>row.length)); const maxDist=(rowMax-1)+(colMax-1); let sumRatio=0,cnt=0; for(let group of notGroups){ for(let i=0;i<group.length;i++){ for(let j=i+1;j<group.length;j++){ let p1=group[i],p2=group[j]; let s1=null,s2=null; for(let s of seats){ if(mapping[s.id]===p1)s1=s; if(mapping[s.id]===p2)s2=s; if(s1&&s2)break; } if(s1&&s2){ let d=Math.abs(s1.row-s2.row)+Math.abs(s1.col-s2.col); sumRatio+=(d/maxDist); cnt++; } } } } if(cnt===0)return 100; return (sumRatio/cnt)*100; },

downloadPDF(){ const table=document.querySelector('#gridArea table'); if(!table){ alert('먼저 [좌석 생성하기] & [고급 자리 배치]를 해주세요.'); return; } const {jsPDF}=window.jspdf; const doc=new jsPDF(); let y=10; for(const row of table.rows){ let x=10; for(const cell of row.cells){ doc.text(cell.textContent,x,y); x+=20; } y+=10; } doc.save('자리배치.pdf'); },

checkInputs(){ const np=parseInt(document.getElementById('numPeople').value,10); const nr=parseInt(document.getElementById('numRows').value,10); const fp=document.getElementById('frontPref').value.trim(); const bp=document.getElementById('backPref').value.trim(); const nt=document.getElementById('notTogether').value.trim(); const popSz=parseInt(document.getElementById('popSize').value,10); const gens=parseInt(document.getElementById('generations').value,10);

if(isNaN(np)||np<1)return {ok:false,msg:'인원 수를 1 이상으로'};
if(isNaN(nr)||nr<1)return {ok:false,msg:'줄(행) 수를 1 이상으로'};
if(isNaN(popSz)||popSz<2)return {ok:false,msg:'고급 탐색 수준은 2 이상으로'};
if(isNaN(gens)||gens<1)return {ok:false,msg:'최적화 단계는 1 이상으로'};

const frontArr=parseList(fp);
const backArr=parseList(bp);
if(hasDup(frontArr))return {ok:false,msg:'앞자리 선호 중 중복 있음'};
if(hasDup(backArr))return {ok:false,msg:'뒷자리 선호 중 중복 있음'};
for(let f of frontArr){
  if(backArr.includes(f))return {ok:false,msg:`${f}가 앞뒤 선호 중복`};
}
for(let v of [...frontArr,...backArr]){
  const x=parseInt(v,10);
  if(x<1||x>np)return {ok:false,msg:`선호번호 ${v}가 인원수 범위 초과`};
}

let notGroups=[];
if(nt!==''){
  let arr=nt.split('/');
  for(let groupStr of arr){
    let group=groupStr.split(',').map(x=>x.trim()).filter(x=>x!=='');
    if(group.length<2)return {ok:false,msg:'같이 앉으면 안되는 그룹은 최소 2명 이상이어야 함'};
    if(hasDup(group))return {ok:false,msg:'같이 앉으면 안되는 그룹 내 중복 있음'};
    for(let v of group){
      const x=parseInt(v,10);
      if(x<1||x>np)return {ok:false,msg:`그룹 내 번호 ${v}가 인원수 범위 초과`};
    }
    notGroups.push(group);
  }
}

return {
  ok:true,
  numPeople:np,
  numRows:nr,
  frontArr,
  backArr,
  notGroups,
  popSize:popSz,
  generations:gens
};

} };



