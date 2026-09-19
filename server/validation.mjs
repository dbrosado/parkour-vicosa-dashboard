import { isDeepStrictEqual } from 'node:util'
import { HttpError, isRecord } from './security.mjs'
const str={kind:'string',max:20000}, id={kind:'string',max:150,min:1}, name={kind:'string',max:300,min:1}, num={kind:'number',min:0,max:1e9}, bool={kind:'boolean'}, date={kind:'date'}, timestamp={kind:'timestamp'}
const en=(...values)=>({kind:'enum',values})
const arr=(item)=>({kind:'array',item})
const obj=(fields,required=[])=>({kind:'object',fields,required})
const optional=(spec)=>({...spec,optional:true})
const attendance=obj({date,status:en('none','present','absent','late'),slotId:id,note:str},['date','status','slotId'])
const payment=obj({id,date,dueDate:date,receipts:arr(obj({id,date,amount:num,method:en('Pix','Cartão','Dinheiro')},['id','date','amount','method'])),monthReference:{kind:'month'},amount:num,amountPaid:num,description:str,status:en('paid','pending','overdue'),paymentMethod:optional(en('Pix','Cartão','Dinheiro')),paidAt:str,plan:en('Mensal','Trimestral','Semestral')},['id','date','monthReference','amount','amountPaid','status'])
const physical=obj({id,date,weight:num,height:num,waistCircumference:num},['id','date','weight','height','waistCircumference'])
const conditioning=obj({id,date,pushUps:num,pullUps:num,verticalJump:num,horizontalJump:num,sitUps:num},['id','date'])
const skill=obj({id,skillName:name,category:en('saltos','escaladas','corridas','giros','vaults','equilibrios','rolamentos','balancos'),status:en('not_started','learning','mastered','fluid'),quality:obj({control:bool,silence:bool,flow:bool,courage:bool}),updatedAt:timestamp},['id','skillName','category','status','quality'])
const student=obj({id,name,birthDate:date,parentName:str,parentContact:str,emergencyPhone:str,allergies:str,status:en('Ativo','Inativo','Trancado'),registrationStatus:en('Completo','Incompleto'),paymentStatus:en('Em dia','Atrasado','Pendente'),mainClass:str,classSlots:arr(str),isTrial:bool,photoUrl:{kind:'url'},enrolledAt:date,plan:en('Mensal','Trimestral','Semestral'),monthlyFee:num,attendanceHistory:arr(attendance),paymentHistory:arr(payment),physicalAssessments:arr(physical),conditioningTests:arr(conditioning),skillAchievements:arr(skill)},['id','name','attendanceHistory','paymentHistory','physicalAssessments','conditioningTests','skillAchievements'])
const instructor=obj({id,name,role:str,photoUrl:{kind:'url'},phone:str,weeklyHours:num,maxHours:num,assignedSlots:arr(obj({day:en('domingo','segunda','terca','quarta','quinta','sexta','sabado'),slotTime:str,ageGroup:str},['day','slotTime','ageGroup']))},['id','name','assignedSlots'])
const stage=en('new','contacted','waiting','trial_scheduled','trial_confirmed','attended','no_show','feedback_pending','plan_recommended','negotiation','enrolled','lost','reactivation')
const history=obj({id,type:en('stage','note','task','trial','message','enrollment'),description:str,createdAt:timestamp},['id','type','description','createdAt'])
const lead=obj({id,studentName:name,guardianName:str,whatsapp:str,email:str,instagram:str,age:optional({...num,max:120}),birthDate:date,city:str,neighborhood:str,source:en('Instagram','Facebook','Google','Indicação','WhatsApp direto','Evento','Panfleto','Escola','Tráfego pago','Site','Aula experimental anterior','Ex-aluno','Outro'),sourceCampaign:str,referralBy:str,mainInterest:str,studentType:en('Criança','Adolescente','Adulto','Família','Calistenia','Evento'),stage,temperature:en('cold','warm','hot'),recommendedPlan:str,recommendedSchedule:str,presentedValue:optional(num),objections:str,lostReason:str,nextAction:str,nextActionAt:timestamp,salesOwner:str,instructorOwner:str,internalNotes:str,communicationConsent:bool,doNotContact:bool,tags:arr(str),createdAt:timestamp,updatedAt:timestamp,lastContactAt:timestamp,history:arr(history)},['id','studentName','stage','tags','history','doNotContact','communicationConsent'])
const task=obj({id,title:name,leadId:str,owner:str,dueAt:timestamp,type:en('call','whatsapp','email','confirm_trial','follow_up','close_sale','reactivate','other'),status:en('pending','completed','cancelled'),priority:en('low','medium','high'),notes:str,createdAt:timestamp},['id','title','type','status','priority'])
const trial=obj({id,leadId:id,date,time:str,className:str,instructor:str,status:en('scheduled','confirmed','attended','no_show','rescheduled','cancelled'),guardianAttendance:en('yes','no','partial','not_applicable'),studentLiked:{kind:'nullableBoolean'},instructorFeedback:str,strengths:str,improvements:str,recommendedPlan:str,planPresented:bool,enrollmentOffered:bool,commercialResult:en('pending','enrolled','thinking','no_response','not_interested','reschedule'),nextFollowUpAt:timestamp,notes:str,createdAt:timestamp},['id','leadId','date','status'])
const message=obj({id,leadId:id,direction:en('incoming','outgoing','internal'),channel:en('whatsapp','email','phone','internal'),content:str,status:en('received','pending','uncertain','sending','sent','delivered','read','failed','unknown'),createdAt:timestamp,externalId:str,clientMessageId:str,error:str,deliveredAt:timestamp,readAt:timestamp,media:obj({type:str,mimeType:str,fileName:str,url:str,size:num})},['id','leadId','direction','channel','content','status','createdAt'])
const template=obj({id,name,category:str,channel:en('whatsapp','email','sms'),content:str,active:bool},['id','name','channel','content','active'])
const opportunity=obj({id,leadId:id,product:name,value:num,status:en('open','won','lost'),expectedCloseAt:timestamp,owner:str,notes:str,lostReason:str,createdAt:timestamp},['id','leadId','product','value','status'])
const expense=obj({id,description:name,amount:num,category:en('aluguel','salarios','energia','agua','materiais','manutencao','marketing','outros'),monthReference:{kind:'month'},createdAt:timestamp},['id','description','amount','category','monthReference'])
const note=obj({slotId:id,date,content:str,createdAt:timestamp},['slotId','date','content','createdAt'])
const event=obj({id,title:name,date},['id','title','date'])
const schemas={students:arr(student),instructors:arr(instructor),operationalExpenses:arr(expense),crmLeads:arr(lead),crmTasks:arr(task),trialClasses:arr(trial),crmMessages:arr(message),messageTemplates:arr(template),crmOpportunities:arr(opportunity)}
function bad(path, reason='valor inválido') {throw new HttpError(400,`${path}: ${reason}.`)}
function validate(value,spec,path,depth=0){
 if(value===undefined&&spec.optional)return
 if(depth>16)bad(path,'estrutura muito profunda')
 if(spec.kind==='string'){if(typeof value!=='string'||value.length>(spec.max||20000)||value.trim().length<(spec.min||0))bad(path,'texto inválido');return}
 if(spec.kind==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<spec.min||value>spec.max)bad(path,'número fora do intervalo permitido');return}
 if(spec.kind==='boolean'){if(typeof value!=='boolean')bad(path,'deve ser verdadeiro ou falso');return}
 if(spec.kind==='nullableBoolean'){if(value!==null&&typeof value!=='boolean')bad(path);return}
 if(spec.kind==='enum'){if(!spec.values.includes(value))bad(path,'opção inválida');return}
 if(spec.kind==='date'){if(typeof value!=='string'||(value!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)))bad(path,'data inválida');return}
 if(spec.kind==='month'){if(typeof value!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))bad(path,'mês inválido');return}
 if(spec.kind==='timestamp'){if(typeof value!=='string'||(value!==''&&!Number.isFinite(Date.parse(value))))bad(path,'data e hora inválidas');return}
 if(spec.kind==='url'){if(typeof value!=='string'||value.length>500000||!(value===''||/^https?:\/\//.test(value)||/^data:image\/(png|jpeg|webp);base64,/.test(value)||(/^\/(?!\/)/.test(value))))bad(path,'endereço de imagem inválido');return}
 if(spec.kind==='array'){if(!Array.isArray(value)||value.length>50000)bad(path,'lista inválida ou muito grande');const ids=new Set();value.forEach((x,i)=>{validate(x,spec.item,`${path}[${i}]`,depth+1);if(x&&typeof x==='object'&&typeof x.id==='string'){if(ids.has(x.id))bad(path,'IDs duplicados');ids.add(x.id)}});return}
 if(spec.kind==='object'){if(!isRecord(value))bad(path,'objeto inválido');for(const key of spec.required||[])if(value[key]===undefined)bad(`${path}.${key}`,'campo obrigatório');for(const [key,item]of Object.entries(value)){if(!Object.hasOwn(spec.fields,key))bad(`${path}.${key}`,'campo desconhecido');validate(item,spec.fields[key],`${path}.${key}`,depth+1)}return}
}
function fillDefaults(value, spec) {
 if (spec.kind === 'array') return value.map(item => fillDefaults(item, spec.item))
 if (spec.kind !== 'object') return value
 const result = {...value}
 for (const [key, field] of Object.entries(spec.fields)) {
   if (result[key] !== undefined) { result[key] = fillDefaults(result[key], field); continue }
   if (field.optional || key === 'media') continue
   if (field.kind === 'array') result[key] = []
   else if (field.kind === 'object') result[key] = fillDefaults({}, field)
   else if (field.kind === 'number') result[key] = 0
   else if (field.kind === 'boolean') result[key] = false
   else if (field.kind === 'nullableBoolean') result[key] = null
   else if (field.kind === 'enum') result[key] = field.values[0]
   else if (!['externalId','clientMessageId','error','deliveredAt','readAt','dueDate','paidAt','updatedAt'].includes(key)) result[key] = ''
 }
 return result
}
export function createEmptyData(){return {students:[],instructors:[],dailyAssignments:{},dailyAttendance:{},classNotes:{},eventColumns:{ideas:[],planning:[],promoting:[],done:[]},operationalExpenses:[],crmLeads:[],crmTasks:[],trialClasses:[],crmMessages:[],messageTemplates:[],crmOpportunities:[]}}
export function normalizeData(input){
 if(!isRecord(input))bad('data','objeto obrigatório')
 const data={...createEmptyData(),...input}
 for(const key of Object.keys(input))if(!Object.hasOwn(createEmptyData(),key))bad(`data.${key}`,'campo desconhecido')
 for(const [key,schema]of Object.entries(schemas)){validate(data[key],schema,`data.${key}`);data[key]=fillDefaults(data[key],schema)}
 for(const field of ['dailyAssignments','dailyAttendance','classNotes']){if(!isRecord(data[field]))bad(field,'objeto obrigatório');for(const [day,entries]of Object.entries(data[field])){validate(day,date,field);if(!isRecord(entries))bad(`${field}.${day}`);for(const [key,value]of Object.entries(entries)){validate(key,id,`${field}.${day}`);if(['__proto__','constructor','prototype'].includes(key))bad(field);if(field==='dailyAssignments')validate(value,arr(id),`${field}.${day}.${key}`);if(field==='dailyAttendance')validate(value,en('none','present','absent','late'),`${field}.${day}.${key}`);if(field==='classNotes'){validate(value,note,`${field}.${day}.${key}`);if(value.date!==day||value.slotId!==key)bad(`${field}.${day}.${key}`,'data ou turma inconsistente')}}}}
 if(!isRecord(data.eventColumns))bad('eventColumns');for(const key of Object.keys(data.eventColumns))if(!['ideas','planning','promoting','done'].includes(key))bad('eventColumns');data.eventColumns={ideas:[],planning:[],promoting:[],done:[],...data.eventColumns};for(const [key,value]of Object.entries(data.eventColumns))validate(value,arr(event),`eventColumns.${key}`)
 const students=new Set(data.students.map(x=>x.id));for(const assignments of Object.values(data.dailyAssignments))for(const list of Object.values(assignments))for(const sid of list)if(!students.has(sid))bad('dailyAssignments','aluno não encontrado');for(const attendance of Object.values(data.dailyAttendance))for(const sid of Object.keys(attendance))if(!students.has(sid))bad('dailyAttendance','aluno não encontrado')
 const leads=new Set(data.crmLeads.map(x=>x.id));for(const field of ['crmTasks','trialClasses','crmMessages','crmOpportunities'])for(const item of data[field])if(item.leadId&&!leads.has(item.leadId))bad(field,'contato vinculado não encontrado')
 return data
}
const trainerStudentFields=['attendanceHistory','physicalAssessments','conditioningTests','skillAchievements']
export function filterState(state,user){if(user.role==='admin')return structuredClone(state);const result=structuredClone(state),data=result.data;for(const field of ['operationalExpenses','crmLeads','crmTasks','trialClasses','crmMessages','messageTemplates','crmOpportunities'])data[field]=[];data.eventColumns={ideas:[],planning:[],promoting:[],done:[]};data.students=data.students.map(s=>({...s,parentName:'',parentContact:'',emergencyPhone:'',paymentStatus:'Pendente',registrationStatus:'Incompleto',monthlyFee:0,plan:'Mensal',paymentHistory:[]}));data.instructors=data.instructors.map(i=>({...i,phone:''}));return result}
export function authorizedData(current,input,user){
 const data=normalizeData(input)
 if(user.role==='admin')return data
 const visible=filterState(current,user).data
 const allowed=new Set(['students','dailyAssignments','dailyAttendance','classNotes'])
 for(const key of Object.keys(data))if(!allowed.has(key)&&!isDeepStrictEqual(data[key],visible[key]))throw new HttpError(403,`Treinadores não podem alterar ${key}.`)
 if(data.students.length!==visible.students.length)throw new HttpError(403,'Treinadores não podem cadastrar ou excluir alunos.')
 const next=structuredClone(current.data)
 next.students=data.students.map(s=>{const original=visible.students.find(x=>x.id===s.id),stored=current.data.students.find(x=>x.id===s.id);if(!original||!stored)throw new HttpError(403,'Aluno inválido.');for(const key of new Set([...Object.keys(s),...Object.keys(original)]))if(!trainerStudentFields.includes(key)&&!isDeepStrictEqual(s[key],original[key]))throw new HttpError(403,`Treinadores não podem alterar ${key} do aluno.`);return {...stored,...Object.fromEntries(trainerStudentFields.map(key=>[key,s[key]]))}})
 for(const key of ['dailyAssignments','dailyAttendance','classNotes'])next[key]=data[key]
 return normalizeData(next)
}
