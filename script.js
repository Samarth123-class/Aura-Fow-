// --- 1. CONFIG & DB ---
const defaultUsers = {
    "master": { pass: "master", role: "Master", name: "System Overlord" },
    "friday": { pass: "ai", role: "Master", name: "Friday (System AI)" },
    "dev": { pass: "dev123", role: "Developer", name: "System Developer" },
    "admin": { pass: "admin", role: "Admin", name: "Principal System" },
    "teach1": { pass: "123", role: "Teacher", name: "Mr. Sharma", subject: "Math", classTeacherOf: "10-A" },
    "stud1": { pass: "123", role: "Student", name: "Rahul", classGrade: "10", section: "A", msgs: [], files: [], timetable: [], marks: [] }
};

let users = JSON.parse(localStorage.getItem('auraUsers')) || defaultUsers;
if(!users["dev"]) { users["dev"] = defaultUsers["dev"]; localStorage.setItem('auraUsers', JSON.stringify(users)); }

let meetings = JSON.parse(localStorage.getItem('auraMeetings')) || [];
let timetables = JSON.parse(localStorage.getItem('auraTimetables')) || []; 
let currentUser = null;
let originalUser = null;

function saveDB() {
    localStorage.setItem('auraUsers', JSON.stringify(users));
    localStorage.setItem('auraMeetings', JSON.stringify(meetings));
    localStorage.setItem('auraTimetables', JSON.stringify(timetables));
}

// --- 2. AUTH & NAV ---
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (users[u] && users[u].pass === p) enterSystem(u);
    else document.getElementById('login-error').style.display = 'block';
}

function enterSystem(username) {
    currentUser = { ...users[username], id: username };
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');
    updateSidebar(currentUser.role);
    checkImpersonationStatus();
    
    document.getElementById('master-panel').classList.add('hidden');
    document.getElementById('generic-welcome').classList.add('hidden');

    if(['Master','Admin','Developer'].includes(currentUser.role)) {
        document.getElementById('master-panel').classList.remove('hidden');
        document.getElementById('welcome-msg-master').innerText = `${currentUser.role} Dashboard`;
        if(currentUser.role === 'Developer') renderDevTimetableLog();
        renderSurveillanceLog();
        renderUserList();
    } else {
        document.getElementById('generic-welcome').classList.remove('hidden');
        document.getElementById('welcome-msg').innerText = `Welcome, ${currentUser.name}`;
    }

    if(currentUser.role === 'Student') renderStudentData();
    if(currentUser.role === 'Teacher') { showSection('tools'); renderTeacherTimetable(); } 
    else if(currentUser.role === 'Developer') showSection('developer'); 
    else showSection('home');
}

function updateSidebar(role) {
    document.getElementById('admin-links').classList.add('hidden');
    document.getElementById('teacher-links').classList.add('hidden');
    document.getElementById('student-links').classList.add('hidden');
    document.getElementById('dev-links').classList.add('hidden');
    if (['Master','Admin'].includes(role)) document.getElementById('admin-links').classList.remove('hidden');
    if (role === 'Teacher') document.getElementById('teacher-links').classList.remove('hidden');
    if (role === 'Student') document.getElementById('student-links').classList.remove('hidden');
    if (role === 'Developer') document.getElementById('dev-links').classList.remove('hidden');
}

function checkImpersonationStatus() {
    if (originalUser) {
        document.getElementById('return-section').classList.remove('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
    } else {
        document.getElementById('return-section').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
    }
}
function logout() { location.reload(); }
function loginAs(targetId) { originalUser = currentUser; enterSystem(targetId); }
function returnToAdmin() { if (originalUser) { const adminId = originalUser.id; originalUser = null; enterSystem(adminId); } }

// --- 3. TEACHER TOOLS ---
function findUser(query) {
    if(!query) return null;
    if(users[query]) return { id: query, ...users[query] };
    const foundKey = Object.keys(users).find(k => users[k].name.toLowerCase().includes(query.toLowerCase()));
    if(foundKey) return { id: foundKey, ...users[foundKey] };
    return null;
}

function addMarks() {
    const query = document.getElementById('rm-search').value;
    const sub = document.getElementById('rm-sub').value;
    const score = document.getElementById('rm-score').value;
    const student = findUser(query);
    if(student && student.role === 'Student' && sub && score) {
        if(!users[student.id].marks) users[student.id].marks = [];
        users[student.id].marks.push({ subject: sub, score: score });
        saveDB(); alert(`Mark Added!`);
    } else alert("Student Not Found");
}

function clearMarks() {
    const query = document.getElementById('rm-search').value;
    const student = findUser(query);
    if(student && student.role === 'Student') {
        if(confirm(`Clear ALL marks for ${student.name}?`)) {
            users[student.id].marks = [];
            saveDB(); alert("Cleared.");
        }
    }
}

function loadClassroom() {
    const cls = document.getElementById('t-filter-class').value;
    const sec = document.getElementById('t-filter-sec').value;
    const list = document.getElementById('classroom-list');
    let html = "";
    Object.keys(users).forEach(key => {
        const u = users[key];
        if(u.role === 'Student' && u.classGrade === cls && u.section === sec) {
            html += `<tr><td>${key}</td><td>${u.name}</td><td><button class="btn-sm-action btn-green" onclick="quickAttend('${key}')">Present</button></td></tr>`;
        }
    });
    list.innerHTML = html || "<tr><td colspan='3' style='text-align:center;'>No students.</td></tr>";
}
function quickAttend(id) { users[id].msgs.push(`Attendance: Present`); saveDB(); alert("Marked"); }

function createMeeting() {
    const topic = document.getElementById('m-topic').value;
    const link = document.getElementById('m-link').value;
    if (topic && link) { meetings.unshift({ id: Date.now(), host: currentUser.name, topic, link, time: new Date().toLocaleTimeString() }); saveDB(); alert("Started"); }
}

function renderTeacherTimetable() {
    const tbody = document.getElementById('t-timetable-body');
    if(tbody) tbody.innerHTML = timetables.length ? timetables.map(t => `<tr><td>${t.day}</td><td>${t.time}</td><td>${t.subject}</td><td>${t.teacher}</td></tr>`).join('') : "<tr><td colspan='4'>Empty</td></tr>";
}

// --- 4. ADMIN & DEV ---
function toggleAdminFields(role) {
    document.getElementById('field-student').classList.add('hidden');
    document.getElementById('field-teacher').classList.add('hidden');
    if(role === 'Student') document.getElementById('field-student').classList.remove('hidden');
    if(role === 'Teacher') document.getElementById('field-teacher').classList.remove('hidden');
}

function registerUser() {
    const u = document.getElementById('new-user').value;
    const n = document.getElementById('new-name').value;
    const r = document.getElementById('new-role').value;
    const p = "123"; 
    let cls = "", sec = "", sub = "", tOf = "";
    if(r === 'Student') { cls = document.getElementById('new-class').value; sec = document.getElementById('new-sec').value; }
    if(r === 'Teacher') { sub = document.getElementById('new-subject').value; tOf = document.getElementById('new-class-teacher').value; }
    if (u) {
        users[u] = { pass: p, role: r, name: n, classGrade: cls, section: sec, subject: sub, classTeacherOf: tOf, msgs: [], files: [], marks: [] };
        saveDB(); renderUserList(); alert("Created (Pass: 123)");
    }
}

function renderUserList() {
    const list = document.getElementById('user-list');
    list.innerHTML = "";
    Object.keys(users).forEach(key => {
        const targetRole = users[key].role.toUpperCase();
        if (currentUser.role !== 'Master' && ['MASTER','DEVELOPER'].includes(targetRole)) return; 

        const u = users[key];
        let extra = "";
        if(u.role === 'Student') extra = `(${u.classGrade}-${u.section})`;
        if(u.role === 'Teacher') extra = `[${u.subject}]`;
        
        // HIDE LOGIN BUTTON FOR SELF
        let loginBtn = `<button class="btn-db btn-login-as" onclick="loginAs('${key}')">Login</button>`;
        if(key === currentUser.id) loginBtn = "";

        list.innerHTML += `
            <div class="db-row">
                <div class="user-details">${u.name} <span style="color:#888;">${u.role} ${extra}</span></div>
                <div class="action-btns">
                    ${loginBtn}
                    <button class="btn-db btn-pass" onclick="alert('${u.pass}')">Pass</button>
                    <button class="btn-db btn-del" onclick="deleteUser('${key}')">Del</button>
                </div>
            </div>`;
    });
}
function deleteUser(key) { if(confirm("Delete?")) { delete users[key]; saveDB(); renderUserList(); } }

function devAddTimetable() {
    const t = document.getElementById('dev-t-name').value;
    const d = document.getElementById('dev-tt-day').value;
    const tm = document.getElementById('dev-tt-time').value;
    const s = document.getElementById('dev-tt-sub').value;
    if(t && tm && s) { timetables.unshift({ teacher: t, day: d, time: tm, subject: s }); saveDB(); renderDevTimetableLog(); alert("Assigned"); }
    else alert("Missing info");
}
function clearTimetable() { if(confirm("Clear Schedule?")) { timetables = []; saveDB(); renderDevTimetableLog(); alert("Cleared"); } }
function renderDevTimetableLog() { document.getElementById('dev-tt-log').innerHTML = timetables.slice(0,5).map(t => `<li>${t.day} P${t.time}: ${t.subject}</li>`).join(''); }
function devAddStudent() {
    const id = document.getElementById('dev-s-id').value;
    const name = document.getElementById('dev-s-name').value;
    const cls = document.getElementById('dev-s-class').value;
    const sec = document.getElementById('dev-s-sec').value;
    if(id && name) { users[id] = { pass: "123", role: "Student", name, classGrade: cls, section: sec, msgs: [], marks: [] }; saveDB(); alert("Saved"); }
}

// --- 5. STUDENT & SHARED ---
function renderStudentData() {
    document.getElementById('s-meeting-list').innerHTML = meetings.length ? meetings.map(m => `<li><span style="color:#5841D8;">${m.topic}</span> <a href="${m.link}" class="join-link" target="_blank">JOIN</a></li>`).join('') : "<li>No active classes.</li>";
    document.getElementById('s-msg-list').innerHTML = currentUser.msgs.length ? currentUser.msgs.reverse().map(m => `<li>${m}</li>`).join('') : "<li>No notices.</li>";
    document.getElementById('s-file-list').innerHTML = currentUser.files.length ? currentUser.files.reverse().map(f => `<li><a href="#" onclick="alert('Downloading ${f}...')">📎 ${f}</a></li>`).join('') : "<li>No files.</li>";
    
    const tbody = document.getElementById('s-report-body');
    let total = 0;
    if(currentUser.marks && currentUser.marks.length > 0) {
        tbody.innerHTML = currentUser.marks.map(m => {
            total += parseInt(m.score);
            return `<tr><td>${m.subject}</td><td>${m.score}</td><td style="color:${m.score>=35?'green':'red'}">${m.score>=35?'Pass':'Fail'}</td></tr>`;
        }).join('');
        const pct = (total / (currentUser.marks.length * 100)) * 100; 
        document.getElementById('s-overall-pct').innerText = Math.round(pct) + "%";
    } else { 
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>No marks.</td></tr>"; 
        document.getElementById('s-overall-pct').innerText = "0%";
    }
}
function renderSurveillanceLog() { document.getElementById('surveillance-log').innerHTML = meetings.map(m => `<li>${m.time}: ${m.host} started ${m.topic}</li>`).join(''); }
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(`section-${id}`).classList.remove('hidden');
    document.querySelectorAll('.menu a').forEach(el => el.classList.remove('active'));
    if(document.getElementById(`nav-${id}`)) document.getElementById(`nav-${id}`).classList.add('active');
}

window.onload = () => { setTimeout(() => document.getElementById('boot-screen').style.display='none', 1500); };
