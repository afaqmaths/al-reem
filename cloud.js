const cloudURL='https://unjvleyhwzylanroufxb.supabase.co', cloudKey='sb_publishable_vm4bYJYJZlvX1Amo7_qBjg_tjzVDPpx';
const defaults={flag:true,motion:true,sound:true,motto:'أنا ريمة السريعة جدًا أتحدى البطء دومًا'};
let state={users:{},results:[],resources:[],hidden:[],settings:{...defaults},extra:[]};
let role='guest',uid='',activeQuiz=null,token='',profile=null,queue=Promise.resolve();
function student(id){return state.users[id]??{name:'متعلّمة '+id,active:false,linked:false}}
async function api(path,method='GET',body,auth=true){
 const headers={'apikey':cloudKey,'Content-Type':'application/json'};
 if(auth&&token)headers.Authorization='Bearer '+token;
 if(path.startsWith('/rest/v1/'))headers.Prefer='return=representation';
 const res=await fetch(cloudURL+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 let data;try{data=await res.json()}catch{data=null}
 if(!res.ok)throw Error('تعذر الاتصال أو العملية غير مسموحة ('+res.status+').');
 return data;
}
async function loadPublic(){
 const rows=await api('/rest/v1/reem_content?id=eq.1&select=payload','GET',undefined,false);
 if(!rows?.length)throw Error('لم يتم العثور على الإعدادات');
 const d=rows[0].payload||{};
 state.settings={...defaults,...(d.settings||{})};
 state.resources=Array.isArray(d.resources)?d.resources.filter(x=>x&&typeof x.section==='string'&&typeof x.title==='string'):[];
 state.hidden=Array.isArray(d.hidden)?d.hidden.filter(x=>typeof x==='string'):[];
 state.extra=Array.isArray(d.extra)?d.extra.filter(x=>x&&/^x[0-9]+$/.test(x.id)&&typeof x.name==='string'):[];
}
function save(){
 if(role!=='admin'||!token)return;
 const payload=JSON.parse(JSON.stringify({resources:state.resources,hidden:state.hidden,settings:state.settings,extra:state.extra}));
 queue=queue.catch(()=>{}).then(async()=>{const rows=await api('/rest/v1/reem_content?id=eq.1','PATCH',{payload});if(!rows?.length)throw Error('لم يتم الحفظ')}).catch(()=>alert('لم يُحفظ التغيير. أعد تسجيل الدخول وحاول مجددًا.'));
}
async function loadPrivate(){
 const students=await api('/rest/v1/reem_students?select=student_no,display_name,active,user_id&order=student_no');
 const attempts=await api('/rest/v1/reem_practice?select=student_no,activity,correct,wrong,created_at&order=created_at.desc');
 state.users=Object.fromEntries(students.map(s=>[String(s.student_no),{name:s.display_name||'متعلّمة '+s.student_no,active:s.active,linked:!!s.user_id}]));
 state.results=attempts.map(x=>({id:String(x.student_no),name:x.activity,correct:x.correct,wrong:x.wrong,accuracy:Math.round(100*x.correct/Math.max(1,x.correct+x.wrong)),date:new Date(x.created_at).toLocaleDateString('ar-KW')}));
}
async function recordPractice(q){if(role!=='student'||!token)return false;try{await api('/rest/v1/reem_practice','POST',{student_no:Number(uid),activity:q.name,correct:q.correct,wrong:q.wrong});await loadPrivate();return true}catch{return false}}
async function boot(){home();try{await loadPublic();if(role==='guest')home();document.querySelector('.notice').textContent='منصة تعليمية متصلة بقاعدة بيانات الريم. التدريب متاح للزوار؛ الحسابات تحتاج إلى تفعيل المشرف. النتائج التدريبية ليست درجات رسمية.'}catch{document.querySelector('.notice').textContent='التعلم متاح، لكن الاتصال بقاعدة البيانات لم ينجح حاليًا.'}}
function loginDialog(){dlg.innerHTML='<h2>بوابات الدخول إلى الريم</h2><p>الدخول للحسابات التي فعّلها المشرف. يمكنك التعلم كزائر.</p><div class="grid" style="grid-template-columns:1fr 1fr"><button onclick="cloudLogin(\'student\')">👧 الطالبة</button><button onclick="cloudLogin(\'parent\')">👪 ولي الأمر</button><button onclick="cloudLogin(\'teacher\')">👩‍🏫 المعلم</button><button onclick="cloudLogin(\'admin\')">⚙ المشرف</button></div><div class="actions"><button onclick="dlg.close()">التصفح كزائر</button></div>';if(!dlg.open)dlg.showModal()}
function cloudLogin(want){
 const sm=want==='student';
 dlg.innerHTML='<h2>دخول '+({student:'الطالبة',parent:'ولي الأمر',teacher:'المعلم',admin:'المشرف'}[want])+'</h2><form id="loginform"><label>'+ (sm?'رقم الحساب (1000 – 1199)':'البريد الإلكتروني')+'</label><input id="sid" required '+(sm?'inputmode="numeric"':'type="email"')+'><label>كلمة المرور</label><input id="pin" type="password" required autocomplete="current-password"><p id="err" role="alert"></p><button class="primary" type="submit">دخول</button> <button type="button" onclick="loginDialog()">رجوع</button></form>';
 $('#loginform').onsubmit=async e=>{e.preventDefault();const id=$('#sid').value.trim(),password=$('#pin').value;
 if(sm&&!validID(id)){$('#err').textContent='رقم الحساب غير صحيح';return}
 try{const login=await api('/auth/v1/token?grant_type=password','POST',{email:sm?'s'+id+'@students.al-reem.invalid':id,password},false);token=login.access_token;
 profile=(await api('/rest/v1/reem_profiles?select=role,student_no'))?.[0];if(!profile||profile.role!==want)throw Error('لم يفعّل المشرف هذا الحساب لهذه البوابة.');
 role=profile.role;uid=String(profile.student_no??'');await loadPrivate();
 if((role==='student'||role==='parent')&&!state.users[uid]?.active)throw Error('الحساب غير مفعّل.');
 dlg.close();dashboard()}catch(e){token='';role='guest';uid='';profile=null;state.users={};state.results=[];$('#err').textContent=e.message||'تعذر تسجيل الدخول'}};
}
async function logout(){try{if(token)await api('/auth/v1/logout','POST')}catch{}token='';profile=null;role='guest';uid='';state.users={};state.results=[];$('#who').textContent='لوحتي';home()}
function changePin(){if(!token)return;dlg.innerHTML='<h2>تغيير كلمة المرور</h2><form id="changeform"><label>كلمة مرور جديدة (12 حرفًا على الأقل)</label><input id="np" type="password" minlength="12" required autocomplete="new-password"><label>التأكيد</label><input id="cp" type="password" required><p id="err"></p><button class="primary" type="submit">حفظ</button> <button type="button" onclick="dlg.close()">إلغاء</button></form>';if(!dlg.open)dlg.showModal();$('#changeform').onsubmit=async e=>{e.preventDefault();let p=$('#np').value;if(p.length<12||p!==$('#cp').value){$('#err').textContent='تأكدي من طول الكلمة وتطابقها.';return}try{await api('/auth/v1/user','PUT',{password:p});dlg.close();alert('تم تغيير كلمة المرور.')}catch(e){$('#err').textContent=e.message}}}
function parentCode(){alert('ربط حساب ولي الأمر يتطلب تفعيلًا مركزيًا من المشرف.')}
async function saveAccount(id){if(role!=='admin'||!token||!validID(id))return;const active=$('#ust').value==='1';if(active&&!student(id).linked){alert('الحساب محجوز ولم يُربط بمستخدم مصادق عليه بعد.');return}try{const rows=await api('/rest/v1/reem_students?student_no=eq.'+id,'PATCH',{display_name:$('#uname').value.trim(),active});if(!rows?.length)throw Error('لم يتم الحفظ');await loadPrivate();dlg.close();accounts()}catch(e){alert(e.message)}}
function resetAccount(){alert('إعادة تعيين كلمة المرور تحتاج إلى تفعيل إدارة المصادقة من المشرف.')}
