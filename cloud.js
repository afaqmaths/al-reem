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
 if(!res.ok){let message='تعذر الاتصال أو العملية غير مسموحة ('+res.status+').';if(path.startsWith('/auth/v1/token')){if(data?.error_code==='invalid_credentials'||data?.code==='invalid_credentials'||res.status===400)message='بيانات الدخول غير صحيحة أو الحساب غير مفعّل. تحقق من اسم المستخدم وكلمة المرور.';if(res.status===429)message='تكررت محاولات الدخول. حاول لاحقًا.';}throw Error(message);}
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
 const sm=want==='student', am=want==='admin';
 dlg.innerHTML='<h2>دخول '+({student:'الطالبة',parent:'ولي الأمر',teacher:'المعلم',admin:'المشرف'}[want])+'</h2><form id="loginform"><label>'+ (sm?'رقم الحساب (1000 – 1199)':am?'اسم المستخدم':'البريد الإلكتروني')+'</label><input id="sid" required '+(sm?'inputmode="numeric"':am?'type="text" autocomplete="username" placeholder="admin" value="admin"':'type="email"')+'><label>كلمة المرور</label><input id="pin" type="password" required autocomplete="current-password"><label style="display:flex;align-items:center;gap:7px"><input type="checkbox" style="width:auto" onchange="document.getElementById(\'pin\').type=this.checked?\'text\':\'password\'">إظهار كلمة المرور</label><p id="err" role="alert"></p><button class="primary" type="submit">دخول</button> <button type="button" onclick="loginDialog()">رجوع</button></form>';
 $('#loginform').onsubmit=async e=>{e.preventDefault();const entered=$('#sid').value.trim(),id=sm?entered.replace(/[٠-٩۰-۹]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.includes(d)?'٠١٢٣٤٥٦٧٨٩'.indexOf(d):'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))):entered,password=$('#pin').value;
 if(sm&&!validID(id)){$('#err').textContent='رقم الحساب غير صحيح؛ أدخل رقمًا من 1000 إلى 1199.';return}$('#err').textContent='جارٍ التحقق من بيانات الدخول…';
 try{const login=await api('/auth/v1/token?grant_type=password','POST',{email:sm?'s'+id+'@students.al-reem.invalid':am&&id.toLowerCase()==='admin'?'admin@al-reem.example':id,password},false);token=login.access_token;
 profile=(await api('/rest/v1/reem_profiles?select=role,student_no,must_change_password'))?.[0];if(!profile||profile.role!==want)throw Error('لم يفعّل المشرف هذا الحساب لهذه البوابة.');
 role=profile.role;uid=String(profile.student_no??'');if(role==='student'&&profile.must_change_password){firstStudentPassword();return}await loadPrivate();
 if((role==='student'||role==='parent')&&!state.users[uid]?.active)throw Error('الحساب غير مفعّل.');
 dashboard();dlg.close()}catch(e){token='';role='guest';uid='';profile=null;state.users={};state.results=[];const msg=$('#err');if(msg)msg.textContent=e.message||'تعذر تسجيل الدخول';else alert(e.message||'تعذر تسجيل الدخول')}};
}
async function logout(){try{if(token)await api('/auth/v1/logout','POST')}catch{}token='';profile=null;role='guest';uid='';state.users={};state.results=[];$('#who').textContent='لوحتي';home()}
function changePin(){if(!token)return;dlg.innerHTML='<h2>تغيير كلمة المرور</h2><form id="changeform"><label>كلمة مرور جديدة (12 حرفًا على الأقل)</label><input id="np" type="password" minlength="12" required autocomplete="new-password"><label>التأكيد</label><input id="cp" type="password" required><p id="err"></p><button class="primary" type="submit">حفظ</button> <button type="button" onclick="dlg.close()">إلغاء</button></form>';if(!dlg.open)dlg.showModal();$('#changeform').onsubmit=async e=>{e.preventDefault();let p=$('#np').value;if(p.length<12||p!==$('#cp').value){$('#err').textContent='تأكدي من طول الكلمة وتطابقها.';return}try{await api('/auth/v1/user','PUT',{password:p});dlg.close();alert('تم تغيير كلمة المرور.')}catch(e){$('#err').textContent=e.message}}}
function parentCode(){alert('ربط حساب ولي الأمر يتطلب تفعيلًا مركزيًا من المشرف.')}
async function saveAccount(id){if(role!=='admin'||!token||!validID(id))return;const active=$('#ust').value==='1';if(active&&!student(id).linked){await provisionStudent(id,$('#uname').value.trim());return}try{const rows=await api('/rest/v1/reem_students?student_no=eq.'+id,'PATCH',{display_name:$('#uname').value.trim(),active});if(!rows?.length)throw Error('لم يتم الحفظ');await loadPrivate();dlg.close();accounts()}catch(e){alert(e.message)}}
async function resetAccount(id){if(role!=='admin'||!token||!validID(id)||reemBatchRunning)return;if(!confirm('إعادة إصدار رمز أولي من ثمانية أرقام للحساب '+id+'؟ سيُلغى الرمز السابق إذا لم تستخدم الطالبة حسابها بعد.'))return;try{const d=await studentAccountAction({action:'reissue',student_no:Number(id)});dlg.innerHTML='<h2>الرمز الأولي الجديد للحساب '+esc(id)+'</h2><p>احتفظ بالرمز في مكان آمن وسلّمه للطالبة أو ولي أمرها فقط. الرمز السابق لم يعد صالحًا.</p><input readonly id="initialSecret" type="password" autocomplete="off"><div class="actions"><button onclick="let x=document.getElementById(\'initialSecret\');x.type=x.type===\'password\'?\'text\':\'password\'">إظهار / إخفاء</button><button onclick="navigator.clipboard.writeText(document.getElementById(\'initialSecret\').value)">نسخ</button><button onclick="dlg.close();accounts()">إغلاق</button></div>';$('#initialSecret').value=d.temporary_password;if(!dlg.open)dlg.showModal()}catch(e){alert(e.message)}}

async function studentAccountAction(payload){
 const res=await fetch(cloudURL+'/functions/v1/manage-student-account',{method:'POST',headers:{apikey:cloudKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await res.json();if(!res.ok)throw Error(data.message||'تعذر تنفيذ العملية');return data
}
async function provisionStudent(id,name){
 if(!confirm('تفعيل الحساب '+id+' وإصدار رمز مؤقت خاص به؟'))return;
 try{const data=await studentAccountAction({action:'provision',student_no:Number(id),display_name:name});await loadPrivate();dlg.innerHTML='<h2>تم تفعيل الحساب '+esc(id)+'</h2><p>تُسلّم كلمة المرور المؤقتة للطالبة أو ولي أمرها بصورة خاصة. يلزم تغييرها عند أول دخول.</p><input readonly id="initialSecret" type="password" autocomplete="off"><div class="actions"><button onclick="let x=document.getElementById(\'initialSecret\');x.type=x.type===\'password\'?\'text\':\'password\'">إظهار / إخفاء</button><button onclick="navigator.clipboard.writeText(document.getElementById(\'initialSecret\').value)">نسخ</button><button onclick="dlg.close();accounts()">إغلاق</button></div>';$('#initialSecret').value=data.temporary_password;if(!dlg.open)dlg.showModal()}catch(e){alert(e.message)}
}
function firstStudentPassword(){
 dlg.innerHTML='<h2>تغيير كلمة المرور عند الدخول الأول</h2><p>اختاري كلمة مرور شخصية من 12 حرفًا على الأقل.</p><form id="firstForm"><label>كلمة المرور الجديدة</label><input id="firstPw" type="password" minlength="12" required autocomplete="new-password"><label>تأكيد كلمة المرور</label><input id="firstConfirm" type="password" minlength="12" required autocomplete="new-password"><p id="firstError" role="alert"></p><button type="submit" class="primary">حفظ ومتابعة</button><button type="button" onclick="dlg.close();logout()">خروج</button></form>';if(!dlg.open)dlg.showModal();
 $('#firstForm').onsubmit=async e=>{e.preventDefault();const p=$('#firstPw').value;if(p.length<12||p!==$('#firstConfirm').value){$('#firstError').textContent='تحققي من طول كلمة المرور وتطابقها';return}try{await studentAccountAction({action:'change',password:p});profile.must_change_password=false;await loadPrivate();dlg.close();dashboard()}catch(e){$('#firstError').textContent=e.message}}
}

let reemBatchRunning=false, reemBatchStop=false, reemBatchRows=[], reemBatchMode='provision';
function bulkStudentDialog(mode='provision'){
 if(role!=='admin'||!token||reemBatchRunning)return;
 if(reemBatchRows.length&&!confirm('توجد رموز من الدفعة السابقة. هل حفظتها بصورة آمنة وتريد بدء دفعة جديدة؟'))return;
 reemBatchRows=[];reemBatchStop=false;reemBatchMode=mode==='reissue'?'reissue':'provision';const reset=reemBatchMode==='reissue';
 dlg.innerHTML='<h2>تفعيل مجموعة من حسابات الطالبات</h2><p>حددي نطاقًا لا يتجاوز 25 حسابًا في الدفعة. تُنشأ كلمة مرور مؤقتة مختلفة لكل طالبة وتجب مشاركتها بصورة خاصة. بعد الانتهاء احفظي كشف الرموز في مكان آمن قبل إغلاق النافذة.</p><label>أول رقم</label><input id="batchFirst" type="number" min="1000" max="1199" value="1000"><label>آخر رقم</label><input id="batchLast" type="number" min="1000" max="1199" value="1024"><p id="batchStatus" role="status">جاهز للتفعيل.</p><div class="actions"><button id="batchStart" class="primary" onclick="runStudentBatch()">تفعيل الدفعة</button><button onclick="reemBatchStop=true">إيقاف بعد الحساب الحالي</button><button id="batchDownload" onclick="downloadStudentBatch()" disabled>تحميل كشف الرموز الخاص</button><button onclick="closeStudentBatch()">إغلاق</button></div>';
 if(reset){dlg.querySelector('h2').textContent='إعادة إصدار الرموز الأولية';dlg.querySelector('p').textContent='اختر نطاق الحسابات المفعّلة التي لم يسبق استخدامها. سيُلغى الرمز السابق لكل حساب ناجح ويُصدر رمز من 8 أرقام. الحسابات التي دخلت أو اختارت كلمة مرور شخصية لن تتغير.';$('#batchLast').value='1014';$('#batchStart').textContent='إعادة إصدار الرموز';$('#batchStatus').textContent='جاهز لإعادة الإصدار.';}if(!dlg.open)dlg.showModal()
}
async function runStudentBatch(){
 if(role!=='admin'||!token||reemBatchRunning)return;
 const a=Number($('#batchFirst').value),b=Number($('#batchLast').value);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<1000||b>1199||b<a||b-a>=25){$('#batchStatus').textContent='حددي من 1 إلى 25 حسابًا ضمن النطاق 1000–1199.';return}
 const reset=reemBatchMode==='reissue';if(!confirm(reset?'إلغاء الرموز الأولية السابقة للحسابات غير المستخدمة في هذا النطاق وإصدار رموز جديدة؟':'تفعيل الحسابات المحجوزة وغير المرتبطة في هذا النطاق؟'))return;
 reemBatchRunning=true;reemBatchStop=false;$('#batchStart').disabled=true;let fail=0,skip=0,created=0;
 try{for(let n=a;n<=b;n++){
 if(reemBatchStop||role!=='admin'||!token)break;
 if(reset?!student(String(n)).linked||!student(String(n)).active:student(String(n)).linked){skip++;continue}
 try{const data=await studentAccountAction({action:reset?'reissue':'provision',student_no:n,display_name:student(String(n)).name||''});reemBatchRows.push([n,data.temporary_password]);created++;$('#batchDownload').disabled=false;state.users[String(n)]={...student(String(n)),linked:true,active:true}}
 catch(e){if(reset&&/سبق استخدامه|اختارت كلمة مرور|ليس مفعّل/.test(e.message)){skip++}else{fail++;if(/401|جلسة|403|تعذر الاتصال/.test(e.message)){reemBatchStop=true}}}
 if($('#batchStatus'))$('#batchStatus').textContent=(reset?'تمت إعادة إصدار ':'تم تفعيل ')+created+'، تم تجاوز '+skip+'، تعذّر '+fail+'؛ آخر حساب '+n;
 }}finally{reemBatchRunning=false;if($('#batchStart'))$('#batchStart').disabled=false;if($('#batchStatus'))$('#batchStatus').textContent='انتهت الدفعة: '+created+(reset?' رمزًا جديدًا، ':' حسابًا جديدًا، ')+skip+' تم تجاوزها، '+fail+' تعذّر. احفظ كشف الرموز الخاص.';try{await loadPrivate()}catch{}}
}
function downloadStudentBatch(){
 if(role!=='admin'||!token||!reemBatchRows.length)return;
 const csv='student_no,temporary_password\r\n'+reemBatchRows.map(x=>x[0]+','+x[1]).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='reem-private-'+reemBatchMode+'-'+Date.now()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function closeStudentBatch(){if(reemBatchRunning){alert('أوقفي الدفعة أولًا.');return}if(reemBatchRows.length&&!confirm('هل حفظت كشف الرموز الخاص؟'))return;reemBatchRows=[];dlg.close();accounts()}
