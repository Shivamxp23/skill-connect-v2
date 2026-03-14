
// User data
let currentUser = null;
let currentRole = 'student';
let joinedClubs = [];
let skillContext = 'student'; // or 'faculty'

// DOM Elements
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const loginBtn = document.getElementById('submitLogin');
const registerBtn = document.getElementById('submitRegister');
const registerFields = document.getElementById('register-fields');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const logoutBtn = document.getElementById('logoutBtn');
const roleBtns = document.querySelectorAll('.role-btn');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const mainHeader = document.getElementById('main-header');
const mainFooter = document.getElementById('main-footer');
const registerName = document.getElementById('registerName');
const registerDepartment = document.getElementById('registerDepartment');
const demoAccountsInfo = document.getElementById('demo-accounts-info');

// API fetch wrapper to automatically add JWT
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('skillconnect_token');
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}

// API base URL (same origin when served by server)
const API_BASE = window.location.origin || 'http://localhost:3000';

// Demo account hints (emails shown on login page; password is in DB)
const demoAccounts = {
    student: {
        email: 'student@skillconnect.edu',
        password: 'password',
        name: 'Shastri Namita',
        title: 'Computer Science Student'
    },
    faculty: {
        email: 'faculty@skillconnect.edu',
        password: 'password',
        name: 'Ms. Prachi Rajput',
        title: 'Platform Administrator'
    }
};

// Track currently editing skill
let editingSkill = null;

// LinkedIn state management
let linkedinProfiles = {
    student: {
        connected: false,
        profileUrl: null,
        connections: 0,
        followers: 0,
        profileData: null
    },
    faculty: {
        connected: false,
        profileUrl: null,
        connections: 0,
        followers: 0,
        profileData: null
    }
};

//skill modelsystem
function createSkillModal() {
    const modalHTML = `
        <div class="modal-overlay" id="skillModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Add New Skill</h3>
                    <button class="modal-close" id="closeSkillModal">&times;</button>
                </div>
                <div class="modal-body">

                    <div class="form-group">
                        <label for="skillName">Skill Name</label>
                        <input type="text" class="form-control" id="skillName" placeholder="Enter skill name">
                    </div>

                    <div class="form-group">
                        <label for="skillLevel">Proficiency Level</label>
                        <select class="form-control" id="skillLevel">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="skillCategory">Category</label>
                        <select class="form-control" id="skillCategory">
                            <option value="programming">Programming</option>
                            <option value="design">Design</option>
                            <option value="data">Data Science</option>
                            <option value="soft-skills">Soft Skills</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="skills-preview">
                        <h4>Preview:</h4>
                        <div class="preview-skill-tag">
                            <span id="previewSkillName">Skill Name</span>
                            <span class="skill-level-badge" id="previewSkillLevel">Beginner</span>
                        </div>
                    </div>

                    <div class="delete-section" id="deleteSection" style="display: none;">
                        <hr>
                        <button class="btn btn-danger" id="deleteSkillBtn" style="width: 100%;">
                            <i class="fas fa-trash"></i> Delete Skill
                        </button>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelSkillBtn">Cancel</button>
                    <button class="btn btn-primary" id="saveSkillBtn">Add Skill</button>
                </div>
            </div>
        </div>
    `;

    // Prevent duplicate modal creation
    if (!document.getElementById('skillModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('closeSkillModal').addEventListener('click', closeSkillModal);
        document.getElementById('cancelSkillBtn').addEventListener('click', closeSkillModal);
        document.getElementById('saveSkillBtn').addEventListener('click', saveSkill);
        document.getElementById('deleteSkillBtn').addEventListener('click', deleteSkill);

        document.getElementById('skillName').addEventListener('input', updateSkillPreview);
        document.getElementById('skillLevel').addEventListener('change', updateSkillPreview);
    }
}

// Profile Edit Modal
function createProfileModal() {
    const modalHTML = `
        <div class="modal-overlay" id="profileModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Profile</h3>
                    <button class="modal-close" id="closeProfileModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="profileTitle">Headline / Title</label>
                        <input type="text" class="form-control" id="profileTitle" placeholder="E.g. Computer Science Student">
                    </div>
                    <div class="form-group">
                        <label for="profileBio">Bio</label>
                        <textarea class="form-control" id="profileBio" rows="3" placeholder="Tell us about yourself"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="profileLinkedin">LinkedIn URL</label>
                        <input type="url" class="form-control" id="profileLinkedin" placeholder="https://linkedin.com/in/username">
                    </div>
                    <div class="form-group">
                        <label for="profileGithub">GitHub URL</label>
                        <input type="url" class="form-control" id="profileGithub" placeholder="https://github.com/username">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelProfileBtn">Cancel</button>
                    <button class="btn btn-primary" id="saveProfileBtn">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    if (!document.getElementById('profileModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('closeProfileModal').addEventListener('click', () => document.getElementById('profileModal').style.display = 'none');
        document.getElementById('cancelProfileBtn').addEventListener('click', () => document.getElementById('profileModal').style.display = 'none');
        document.getElementById('saveProfileBtn').addEventListener('click', saveProfileChanges);
    }
}

function openProfileModal() {
    if (!currentUser) return;
    document.getElementById('profileTitle').value = currentUser.title || '';
    document.getElementById('profileBio').value = currentUser.bio || '';
    document.getElementById('profileLinkedin').value = currentUser.linkedin_url || '';
    document.getElementById('profileGithub').value = currentUser.github_url || '';
    document.getElementById('profileModal').style.display = 'flex';
}

async function saveProfileChanges() {
    if (!currentUser) return;
    const title = document.getElementById('profileTitle').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    const linkedin_url = document.getElementById('profileLinkedin').value.trim();
    const github_url = document.getElementById('profileGithub').value.trim();

    try {
        const res = await authFetch(`${API_BASE}/api/user/${currentUser.id}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, bio, linkedin_url, github_url })
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser.title = title;
            currentUser.bio = bio;
            currentUser.linkedin_url = linkedin_url;
            currentUser.github_url = github_url;
            
            // update UI
            const cfg = ROLE_CONFIG[currentUser.role];
            if (cfg) document.getElementById(cfg.titleId).textContent = currentUser.title;
            
            updateProfileLinksUI(currentUser);

            document.getElementById('profileModal').style.display = 'none';
            showNotification('Profile updated successfully!', 'success');
        } else {
            showNotification(data.error || 'Failed to update profile', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Network error while saving profile.', 'error');
    }
}

function updateProfileLinksUI(user) {
    if (user.role === 'student') {
        const liStatus = document.getElementById('studentLinkedinStatus');
        const liBtnC = document.getElementById('connectStudentLinkedinBtn');
        const liBtnV = document.getElementById('viewStudentLinkedinBtn');
        if (user.linkedin_url && liStatus) {
            liStatus.innerHTML = '<span style="color: var(--primary);"><i class="fas fa-check-circle"></i> Connected</span>';
            if (liBtnC) liBtnC.style.display = 'none';
            if (liBtnV) {
                liBtnV.style.display = 'block';
                liBtnV.onclick = () => window.open(user.linkedin_url, '_blank');
            }
        }
        
        const ghStatus = document.getElementById('studentGithubStatus');
        const ghBtnC = document.getElementById('connectStudentGithubBtn');
        const ghBtnV = document.getElementById('viewStudentGithubBtn');
        if (user.github_url && ghStatus) {
            ghStatus.innerHTML = '<span style="color: var(--primary);"><i class="fas fa-check-circle"></i> Connected</span>';
            if (ghBtnC) ghBtnC.style.display = 'none';
            if (ghBtnV) {
                ghBtnV.style.display = 'block';
                ghBtnV.onclick = () => window.open(user.github_url, '_blank');
            }
        }
    }
}

function closeSkillModal() {
    const skillModal = document.getElementById('skillModal');
    if (skillModal) skillModal.style.display = 'none';
    editingSkill = null;
}

function updateSkillPreview() {
    const skillName = document.getElementById('skillName').value || 'Skill Name';
    const skillLevel = document.getElementById('skillLevel').value;

    document.getElementById('previewSkillName').textContent = skillName;
    document.getElementById('previewSkillLevel').textContent =
        skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);
}

function openEditSkillModal(skillElement) {
    editingSkill = skillElement;

    document.getElementById('modalTitle').textContent = 'Edit Skill';
    document.getElementById('saveSkillBtn').textContent = 'Update Skill';
    document.getElementById('deleteSection').style.display = 'block';

    const name = skillElement.childNodes[0].textContent.trim();
    const level = skillElement.querySelector('.skill-level-badge').textContent.toLowerCase();
    const category = skillElement.getAttribute('data-category');

    document.getElementById('skillName').value = name;
    document.getElementById('skillLevel').value = level;
    document.getElementById('skillCategory').value = category;

    updateSkillPreview();
    document.getElementById('skillModal').style.display = 'flex';
}

function initializeExistingSkills() {
    const lists = [
        document.getElementById('studentSkillsList'),
        document.getElementById('facultyResearchAreas')
    ];

    lists.forEach(list => {
        if (!list) return;

        list.querySelectorAll('.skill-tag').forEach(skill => {
            if (!skill.hasAttribute('data-edit-init')) {
                skill.setAttribute('data-edit-init', 'true');

                skill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditSkillModal(skill);
                });
            }
        });
    });
}

async function deleteSkill() {
    if (!editingSkill) return;

    if (!confirm('Delete this skill?')) return;

    const skillName = editingSkill.childNodes[0].textContent.trim();
    if (currentUser?.id) {
        try {
            const res = await fetch(`${API_BASE}/api/user/${currentUser.id}/skills/${encodeURIComponent(skillName)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
        } catch (err) {
            console.error(err);
            showNotification('Could not delete from database', 'error');
        }
    }
    editingSkill.remove();
    const count = document.getElementById('studentSkills');
    if (count) count.textContent = Math.max(0, parseInt(count.textContent, 10) - 1);
    showNotification('Skill deleted!', 'success');
    closeSkillModal();
}

//notifications
function showNotification(msg, type = 'info') {
    const box = document.createElement('div');
    box.className = `notification ${type}`;
    box.textContent = msg;

    document.body.appendChild(box);

    setTimeout(() => box.classList.add('show'), 30);
    setTimeout(() => {
        box.classList.remove('show');
        setTimeout(() => box.remove(), 250);
    }, 2600);
}

//netwrok filter option
function initializeNetworkFilters() {
    const departmentFilter = document.getElementById('departmentFilter');
    const skillsFilter = document.getElementById('skillsFilter');
    const roleFilter = document.getElementById('roleFilter');
    const yearFilter = document.getElementById('yearFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    const profileCards = document.querySelectorAll('#network-page .profile-card');

    let activeFilters = {
        department: "",
                skills: "",
        role: "",
        year: ""
    };

    function applyFilters() {
        const dep = departmentFilter.value.toLowerCase();
        const skillsVal = skillsFilter.value.toLowerCase();
        const roleVal = roleFilter.value;
        const yearVal = yearFilter.value;

        activeFilters = {
            department: dep,
            skills: skillsVal,
            role: roleVal,
            year: yearVal
        };

        let count = 0;

        profileCards.forEach(card => {
            let show = true;

            const cardDept = card.getAttribute('data-department');
            const cardRole = card.getAttribute('data-role');
            const cardYear = card.getAttribute('data-year');
            const cardSkills = card.getAttribute('data-skills');

            if (dep && cardDept !== dep) show = false;
            if (skillsVal && !cardSkills.includes(skillsVal)) show = false;
            if (roleVal && cardRole !== roleVal) show = false;
            if (yearVal && cardYear !== yearVal) show = false;

            card.style.display = show ? 'block' : 'none';
            if (show) count++;
        });

        document.getElementById('resultsCount').textContent =
            `${count} profile${count !== 1 ? 's' : ''}`;
    }

    resetFiltersBtn.addEventListener('click', () => {
        departmentFilter.value = "";
        skillsFilter.value = "";
        roleFilter.value = "";
        yearFilter.value = "";
        applyFilters();
    });

    applyFiltersBtn.addEventListener('click', applyFilters);

    applyFilters();
}

//connect btns
function initializeConnectButtons() {
    const buttons = document.querySelectorAll('#network-page .btn-primary');

    buttons.forEach(button => {
        if (!button.hasAttribute('data-init')) {
            button.setAttribute('data-init', 'true');

            button.addEventListener('click', function () {
                const profileCard = this.closest('.profile-card');
                const name = profileCard.querySelector('.profile-name').textContent;

                this.innerHTML = '<i class="fas fa-check"></i> Request Sent';
                this.classList.remove('btn-primary');
                this.classList.add('btn-outline');
                this.disabled = true;

                showNotification(`Connection request sent to ${name}`, 'success');
            });
        }
    });
}

//mentorship and groups
function initializeMentorshipButtons() {
    // Mentorship
    const mentorBtns = document.querySelectorAll('.mentorship-list .btn');

    mentorBtns.forEach(btn => {
        if (!btn.hasAttribute('data-init')) {
            btn.setAttribute('data-init', 'true');

            btn.addEventListener('click', function () {
                const name = this.closest('.mentor-item')
                    .querySelector('.post-user').textContent;

                this.innerHTML = '<i class="fas fa-check"></i> Requested';
                this.classList.remove('btn-outline');
                this.classList.add('btn-primary');
                this.disabled = true;

                showNotification(`Request sent to ${name}`, 'success');
            });
        }
    });

    // Groups
    const groupBtns = document.querySelectorAll('.groups-list .btn');

    groupBtns.forEach(btn => {
        if (!btn.hasAttribute('data-init')) {
            btn.setAttribute('data-init', 'true');

            btn.addEventListener('click', function () {
                const name = this.closest('.group-item')
                    .querySelector('.post-user').textContent;

                this.innerHTML = '<i class="fas fa-check"></i> Joined';
                this.classList.remove('btn-outline');
                this.classList.add('btn-primary');
                this.disabled = true;

                showNotification(`Joined ${name}`, 'success');
            });
        }
    });
}

//initialize network page
async function initializeNetworkPage() {
    const grid = document.querySelector('.profiles-grid');
    if (!grid) return;

    try {
        const res = await authFetch(`${API_BASE}/api/users`);
        const data = await res.json();
        
        if (data.success && data.users) {
            grid.innerHTML = '';
            
            data.users.forEach(user => {
                const skillsArr = user.skills || [];
                const skillsStr = skillsArr.map(s => s.toLowerCase()).join(',');
                
                const card = document.createElement('div');
                card.className = 'profile-card';
                card.setAttribute('data-id', user.id);
                card.setAttribute('data-department', (user.department || '').toLowerCase());
                card.setAttribute('data-role', user.role || '');
                card.setAttribute('data-year', user.year || '');
                card.setAttribute('data-skills', skillsStr);
                
                const skillsTags = skillsArr.map(s => `<span class="skill-tag">${s}</span>`).join('');
                
                let titleStr = user.title || '';
                if (user.role === 'student' && user.department && user.year) {
                    titleStr = `${titleStr} ${user.department} - ${user.year} Year`;
                }
                
                card.innerHTML = `
                    <div class="profile-avatar"><i class="fas fa-user-tie"></i></div>
                    <div class="profile-name">${user.full_name}</div>
                    <div class="profile-title">${titleStr}</div>
                    <div class="profile-skills">
                        ${skillsTags}
                    </div>
                    <div class="profile-actions">
                        <button class="btn btn-primary connect-btn">Connect</button>
                        <button class="btn btn-outline">View Profile</button>
                    </div>
                `;
                
                grid.appendChild(card);
            });
            
            // Re-bind click events for the new connect buttons
            const connectBtns = grid.querySelectorAll('.connect-btn');
            connectBtns.forEach(btn => {
                btn.addEventListener('click', async function() {
                    const parentCard = this.closest('.profile-card');
                    const targetId = parentCard.getAttribute('data-id');
                    const targetName = parentCard.querySelector('.profile-name').textContent;
                    
                    try {
                        const creq = await authFetch(`${API_BASE}/api/connections/request`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ receiverId: targetId })
                        });
                        const cdata = await creq.json();
                        
                        if (cdata.success) {
                            this.innerHTML = '<i class="fas fa-check"></i> Request Sent';
                            this.classList.remove('btn-primary');
                            this.classList.add('btn-outline');
                            this.disabled = true;
                            showNotification(`Connection request sent to ${targetName}`, 'success');
                        } else {
                            showNotification(cdata.error || 'Failed to send request', 'error');
                        }
                    } catch (e) {
                        showNotification('Network error sending request', 'error');
                    }
                });
            });
            
            // Re-initialize filters now that nodes exist
            initializeNetworkFilters();
        }
    } catch(e) {
        console.error("Network fetching failed", e);
    }
    initializeMentorshipButtons();
    fetchConnections();
}

async function fetchConnections() {
    const incContainer = document.getElementById('incoming-requests-container');
    const sentContainer = document.getElementById('sent-requests-container');
    const myContainer = document.getElementById('my-connections-container');
    
    if (!incContainer || !sentContainer || !myContainer) return;
    
    try {
        const res = await authFetch(`${API_BASE}/api/connections`);
        const data = await res.json();
        
        if (data.success && data.connections) {
            // clear containers except headers
            const clearTgt = (tgt) => {
                Array.from(tgt.children).forEach(c => {
                    if (c.tagName !== 'H4') c.remove();
                });
            };
            clearTgt(incContainer); clearTgt(sentContainer); clearTgt(myContainer);
            
            data.connections.forEach(conn => {
                const isIncoming = conn.receiver_id === currentUser.id && conn.status === 'pending';
                const isSent = conn.sender_id === currentUser.id && conn.status === 'pending';
                const isMy = conn.status === 'accepted';
                
                const item = document.createElement('div');
                item.className = 'request-item';
                
                let titleParts = [conn.department, conn.role].filter(Boolean).join(' - ');
                if (!titleParts) titleParts = conn.title || '';
                
                item.innerHTML = `
                    <div class="post-header">
                        <div class="post-avatar"><i class="fas fa-user"></i></div>
                        <div>
                            <div class="post-user">${conn.full_name}</div>
                            <div class="post-time">${titleParts}</div>
                        </div>
                    </div>
                `;
                
                if (isIncoming) {
                    item.innerHTML += `
                        <div class="request-actions">
                            <button class="btn btn-primary btn-small conn-accept" data-id="${conn.id}"><i class="fas fa-check"></i></button>
                            <button class="btn btn-outline btn-small conn-decline" data-id="${conn.id}"><i class="fas fa-times"></i></button>
                        </div>
                    `;
                    incContainer.appendChild(item);
                } else if (isSent) {
                    item.innerHTML += `
                        <div class="request-status"><span style="color: var(--gray); font-size: 0.8rem;">Pending</span></div>
                    `;
                    sentContainer.appendChild(item);
                } else if (isMy) {
                    item.innerHTML += `
                        <div class="request-status"><span style="color: var(--primary); font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Connected</span></div>
                    `;
                    myContainer.appendChild(item);
                }
            });
            
            document.querySelectorAll('.conn-accept').forEach(btn => btn.addEventListener('click', () => updateConnection(btn.getAttribute('data-id'), 'accepted')));
            document.querySelectorAll('.conn-decline').forEach(btn => btn.addEventListener('click', () => updateConnection(btn.getAttribute('data-id'), 'declined')));
        }
    } catch(err) {
        console.error("fetchConnections error", err);
    }
}

async function updateConnection(id, status) {
    try {
        const res = await authFetch(`${API_BASE}/api/connections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`Connection ${status}`, 'success');
            fetchConnections(); // refresh lists
        } else {
            showNotification(data.error || 'Failed', 'error');
        }
    } catch(e) {
        showNotification('Network error', 'error');
    }
}

//navs + log in
if (loginBtn) loginBtn.addEventListener('click', handleLogin);
if (registerBtn) registerBtn.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);

if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabLogin.style.borderBottomColor = 'var(--primary)';
        tabLogin.style.color = 'var(--primary)';
        
        tabRegister.classList.remove('active');
        tabRegister.style.borderBottomColor = 'transparent';
        tabRegister.style.color = 'var(--gray)';
        
        registerFields.style.display = 'none';
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'none';
        demoAccountsInfo.style.display = 'block';
    });
    
    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabRegister.style.borderBottomColor = 'var(--primary)';
        tabRegister.style.color = 'var(--primary)';
        
        tabLogin.classList.remove('active');
        tabLogin.style.borderBottomColor = 'transparent';
        tabLogin.style.color = 'var(--gray)';
        
        registerFields.style.display = 'block';
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'block';
        demoAccountsInfo.style.display = 'none';
    });
}

roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRole = btn.getAttribute('data-role');
    });
});

navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        showPage(page);

        navLinks.forEach(nav => nav.classList.remove('active'));
        e.target.classList.add('active');
    });
});

//hiding club for faculty and skill summary for student
// Hide role-specific pages & buttons
function applyRoleBasedUI(role) {

    // --- CLUBS ---
    document.querySelectorAll('.nav-link[data-page="clubs"]').forEach(el => {
        el.style.display = role === 'faculty' ? 'none' : '';
    });

    const exploreClubsBtn = document.getElementById('exploreClubsBtn');
    if (exploreClubsBtn) {
        exploreClubsBtn.style.display = role === 'faculty' ? 'none' : '';
    }

    // --- SKILL SUMMARY ---
    document.querySelectorAll('.nav-link[data-page="skill-summary"]').forEach(el => {
        el.style.display = role === 'student' ? 'none' : '';
    });

    const exploreSkillSummaryBtn = document.getElementById('exploreskill-summaryBtn');
    if (exploreSkillSummaryBtn) {
        exploreSkillSummaryBtn.style.display = role === 'student' ? 'none' : '';
    }

    // --- FORCE CLOSE PAGES ---
    if (role === 'faculty') {
        document.getElementById('clubs-page')?.classList.remove('active');
    }

    if (role === 'student') {
        document.getElementById('skill-summary-page')?.classList.remove('active');
    }
}

/* ---------------------- PROJECTS LOGIC ---------------------- */
async function initializeProjectsPage() {
    const feed = document.getElementById('projects-feed');
    if (!feed) return;
    
    try {
        const res = await authFetch(`${API_BASE}/api/projects`);
        const data = await res.json();
        
        if (data.success && data.projects) {
            feed.innerHTML = '';
            if (data.projects.length === 0) {
                feed.innerHTML = '<div style="text-align: center; color: var(--gray); padding: 20px;">No projects posted yet. Be the first!</div>';
            }
            
            data.projects.forEach(proj => {
                const card = document.createElement('div');
                card.className = 'card post-card';
                
                let tagsHtml = '';
                if (proj.tags) {
                    const tags = proj.tags.split(',');
                    tagsHtml = `<div class="skills-list" style="margin-top: 10px;">` + 
                        tags.map(t => `<span class="skill-tag">${t.trim()}</span>`).join('') +
                        `</div>`;
                }
                
                card.innerHTML = `
                    <div class="post-header">
                        <div class="post-avatar"><i class="fas fa-project-diagram"></i></div>
                        <div>
                            <div class="post-user">${proj.title}</div>
                            <div class="post-time">Posted by ${proj.owner_name} • ${new Date(proj.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${proj.description}</p>
                        ${tagsHtml}
                    </div>
                    <div class="post-actions" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px;">
                        <button class="btn btn-primary btn-small proj-apply-btn" data-id="${proj.id}">Apply to Collaborate</button>
                    </div>
                `;
                
                feed.appendChild(card);
            });
            
            document.querySelectorAll('.proj-apply-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const projectId = this.getAttribute('data-id');
                    try {
                        const res = await authFetch(`${API_BASE}/api/projects/${projectId}/apply`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rolePlay: 'Collaborator', message: 'I am interested in collaborating!' })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showNotification('Application sent!', 'success');
                            this.innerHTML = '<i class="fas fa-check"></i> Applied';
                            this.disabled = true;
                            this.classList.replace('btn-primary', 'btn-outline');
                        } else {
                            showNotification(data.error || 'Failed to apply', 'error');
                        }
                    } catch (e) {
                         showNotification('Network error', 'error');
                    }
                });
            });
        }
    } catch(err) {
        console.error("fetchProjects error", err);
    }
}

// Form handlers for creating events and clubs (wired on DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    // Create Event form
    const createEventBtn = document.getElementById('createEventBtn');
    if (createEventBtn) {
        createEventBtn.addEventListener('click', async () => {
            const title = document.getElementById('newEventTitle')?.value.trim();
            const desc = document.getElementById('newEventDesc')?.value.trim();
            const start = document.getElementById('newEventStart')?.value;
            const end = document.getElementById('newEventEnd')?.value;
            const loc = document.getElementById('newEventLocation')?.value.trim();
            if (!title || !start || !end) return showNotification('Title, start and end time required', 'error');
            try {
                const res = await authFetch(`${API_BASE}/api/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description: desc, start_time: start, end_time: end, location: loc })
                });
                const data = await res.json();
                if (data.success) {
                    showNotification('Event created!', 'success');
                    ['newEventTitle','newEventDesc','newEventStart','newEventEnd','newEventLocation'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
                    initializeEventsPage();
                } else showNotification(data.error || 'Failed', 'error');
            } catch(e) { showNotification('Network error', 'error'); }
        });
    }

    // Create Club form
    const createClubBtn = document.getElementById('createClubBtn');
    if (createClubBtn) {
        createClubBtn.addEventListener('click', async () => {
            const name = document.getElementById('newClubName')?.value.trim();
            const desc = document.getElementById('newClubDesc')?.value.trim();
            const cat = document.getElementById('newClubCategory')?.value.trim();
            if (!name) return showNotification('Club name required', 'error');
            try {
                const res = await authFetch(`${API_BASE}/api/clubs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description: desc, category: cat })
                });
                const data = await res.json();
                if (data.success) {
                    showNotification('Club created!', 'success');
                    ['newClubName','newClubDesc','newClubCategory'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
                    initializeClubsPage();
                } else showNotification(data.error || 'Failed', 'error');
            } catch(e) { showNotification('Network error', 'error'); }
        });
    }
});

/* ---------------------- PAGE SWITCHER ---------------------- */
function showPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));

    if (pageId === 'dashboard') {
        if (currentRole === 'student') {
            document.getElementById('student-dashboard')?.classList.add('active');
            setTimeout(initializeExistingSkills, 100);
        } else {
            document.getElementById('faculty-dashboard')?.classList.add('active');
        }
        return;
    }

    if (pageId === 'skill-summary') {
        document.getElementById('skill-summary-page')?.classList.add('active');
        return;
    }

    const pageEl = document.getElementById(`${pageId}-page`);
    if (pageEl) pageEl.classList.add('active');

    if (pageId === 'network') setTimeout(initializeNetworkPage, 100);
    if (pageId === 'clubs') setTimeout(initializeClubsPage, 100);
    if (pageId === 'projects') setTimeout(initializeProjectsPage, 150);
    if (pageId === 'events') setTimeout(initializeEventsPage, 100);
    if (pageId === 'profile') setTimeout(loadProfilePage, 100);
}

async function loadProfilePage() {
    if (!currentUser?.id) return;
    // Load activity & projects into the right panel
    const activityEl = document.getElementById('profileActivityFeed');
    if (activityEl) {
        activityEl.innerHTML = '<div style="color:var(--gray);padding:10px;">Loading...</div>';
        try {
            const res = await authFetch(`${API_BASE}/api/user/${currentUser.id}/projects`);
            const data = await res.json();
            if (data.success && data.projects.length) {
                activityEl.innerHTML = data.projects.map(p => `
                    <div style="border-bottom:1px solid var(--border);padding:12px 0;">
                        <div style="font-weight:700;">${p.title}</div>
                        <div style="color:var(--gray);font-size:0.9rem;margin-top:4px;">${p.description}</div>
                        <div style="font-size:0.8rem;color:var(--gray);margin-top:4px;">${new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                `).join('');
            } else {
                activityEl.innerHTML = "<div style='color:var(--gray);padding:10px;'>No projects yet. Post one from the Projects page!</div>";
            }
        } catch(e) {
            activityEl.innerHTML = "<div style='color:var(--gray);padding:10px;'>Could not load projects.</div>";
        }
    }
    await loadUserStats();
}

//login handle — uses SQL database via /api/login
async function handleLogin() {
    const email = authEmail.value.trim();
    const pass = authPassword.value;

    if (!email || !pass) return showNotification('Please fill in all fields', 'error');

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, role: currentRole })
        });
        const data = await res.json();

        if (data.success && data.user) {
            localStorage.setItem('skillconnect_token', data.token); // Save token
            currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                title: data.user.title || '',
                role: data.user.role,
                department: data.user.department || '',
                bio: data.user.bio || '',
                linkedin_url: data.user.linkedin_url || '',
                github_url: data.user.github_url || ''
            };
            showDashboard();
            updateProfileLinksUI(currentUser);
            showNotification(`Welcome ${currentUser.name}!`, 'success');
            loadUserSkillsFromDb();
        } else {
            showNotification(data.error || 'Invalid email or password.', 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showNotification('Cannot reach server. Start the server and ensure the database is set up.', 'error');
    }
}

//register handle
async function handleRegister() {
    const email = authEmail.value.trim();
    const pass = authPassword.value;
    const name = registerName.value.trim();
    const department = registerDepartment.value;

    if (!email || !pass || !name) return showNotification('Please fill in all required fields (Name, Email, Password)', 'error');

    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: pass, role: currentRole, department })
        });
        const data = await res.json();

        if (data.success && data.user) {
            localStorage.setItem('skillconnect_token', data.token); // Save token
            currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                title: data.user.title || '',
                role: data.user.role,
                department: data.user.department || '',
                bio: data.user.bio || '',
                linkedin_url: data.user.linkedin_url || '',
                github_url: data.user.github_url || ''
            };
            showDashboard();
            showNotification(`Welcome to SkillConnect, ${currentUser.name}!`, 'success');
            loadUserSkillsFromDb();
        } else {
            showNotification(data.error || 'Registration failed.', 'error');
        }
    } catch (err) {
        console.error('Register error:', err);
        showNotification('Cannot reach server.', 'error');
    }
}


function showDashboard() {
    mainHeader.classList.remove('hidden');
    mainFooter.classList.remove('hidden');

    applyRoleBasedUI(currentRole);

    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('login-page').classList.remove('active');

    const cfg = ROLE_CONFIG[currentRole];

    document.getElementById(cfg.dashboardId).classList.add('active');
    document.getElementById(cfg.nameId).textContent = currentUser.name;
    document.getElementById(cfg.titleId).textContent = currentUser.title || '';

    navLinks.forEach(n => n.classList.remove('active'));
    document.querySelector('[data-page="dashboard"]').classList.add('active');

    setTimeout(initializeSkills, 100);
    initializeLinkedInButtons();
    setTimeout(initializeLinkedInOnDashboardLoad, 150);

    // Profile Modal initialization
    createProfileModal();
    const editStudentBtn = document.getElementById('editStudentProfileBtn');
    const editFacultyBtn = document.getElementById('editFacultyProfileBtn');
    if (editStudentBtn && !editStudentBtn.hasAttribute('data-init')) {
        editStudentBtn.setAttribute('data-init', 'true');
        editStudentBtn.addEventListener('click', openProfileModal);
    }
    if (editFacultyBtn && !editFacultyBtn.hasAttribute('data-init')) {
        editFacultyBtn.setAttribute('data-init', 'true');
        editFacultyBtn.addEventListener('click', openProfileModal);
    }

    // Load real stats from DB
    loadUserStats();
}

async function loadUserStats() {
    if (!currentUser?.id) return;
    try {
        const res = await authFetch(`${API_BASE}/api/user/${currentUser.id}/stats`);
        const data = await res.json();
        if (data.success) {
            const s = data.stats;
            const connEl = document.getElementById('studentConnections');
            const projEl = document.getElementById('studentProjects');
            const skillEl = document.getElementById('studentSkills');
            if (connEl) connEl.textContent = s.connections;
            if (projEl) projEl.textContent = s.projects;
            if (skillEl) skillEl.textContent = s.skills;
        }
    } catch(e) {
        console.error('Stats load error', e);
    }
}

function handleLogout() {
    currentUser = null;
    mainHeader.classList.add('hidden');
    mainFooter.classList.add('hidden');

    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('login-page').classList.add('active');

    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    if (registerName) registerName.value = '';
    localStorage.removeItem('skillconnect_token');
    applyRoleBasedUI('student');
}

//club join leave ui
function initializeJoinClubButtons() {
    const buttons = document.querySelectorAll('#allClubsList .btn-outline');

    buttons.forEach(btn => {
        if (!btn.hasAttribute("data-joined-init")) {
            btn.setAttribute("data-joined-init", "true");

            btn.addEventListener('click', function () {
                const clubName = this.closest('.club-card-custom')
                    .querySelector('strong').textContent;

                // Add to joined list if not already
                if (!joinedClubs.includes(clubName)) {
                    joinedClubs.push(clubName);
                    updateMyClubsUI();
                    showNotification(`Joined ${clubName}`, 'success');
                }

                // Change button state
                this.textContent = "Joined ✔";
                this.classList.remove("btn-outline");
                this.classList.add("btn-primary");
                this.disabled = true;
            });
        }
    });
}

// Update My Clubs UI & dashboard clubs
function updateMyClubsUI() {
    const myClubsList = document.getElementById("myClubsList");
    const dashboardClubs = document.getElementById("studentClubs");

    // Clear
    if (myClubsList) myClubsList.innerHTML = "";
    if (dashboardClubs) dashboardClubs.innerHTML = "";

    if (joinedClubs.length === 0) {
        if (myClubsList) myClubsList.innerHTML =
            `<div style="color: var(--gray); padding: 10px 0;">You haven't joined any clubs yet.</div>`;
        if (dashboardClubs) dashboardClubs.innerHTML =
            `<div class="event-card">
                <div class="event-date">
                    <div class="event-day">--</div>
                </div>
                <div class="event-details">
                    <div class="event-title">No Clubs Joined</div>
                </div>
            </div>`;
        return;
    }

    joinedClubs.forEach(club => {
        if (myClubsList) {
            myClubsList.innerHTML += `
                <div class="club-card-custom">
                    <strong>${club}</strong>
                    <p style="color: var(--gray); font-size: 0.9rem;">Member</p>
                    <button class="btn btn-outline leave-btn" 
                            style="margin-top: 8px;" 
                            data-club="${club}">
                        Leave Club
                    </button>
                </div>
            `;
        }

        if (dashboardClubs) {
            dashboardClubs.innerHTML += `
                <div class="event-card">
                    <div class="event-date">
                        <div class="event-day">${club.substring(0, 2).toUpperCase()}</div>
                    </div>
                    <div class="event-details">
                        <div class="event-title">${club}</div>
                        <div class="event-time">Member</div>
                    </div>
                </div>
            `;
        }
    });

    // Activate leave buttons
    initializeLeaveButtons();
    updateAllClubsButtons();
}

function initializeLeaveButtons() {
    const leaveButtons = document.querySelectorAll(".leave-btn");

    leaveButtons.forEach(btn => {
        if (!btn.hasAttribute('data-leave-init')) {
            btn.setAttribute('data-leave-init', 'true');

            btn.addEventListener("click", function () {
                const clubName = this.getAttribute("data-club");
                joinedClubs = joinedClubs.filter(c => c !== clubName);

                showNotification(`Left ${clubName}`, "error");

                // Refresh UI everywhere
                updateMyClubsUI();
                updateAllClubsButtons();
            });
        }
    });
}

function updateAllClubsButtons() {
    const clubCards = document.querySelectorAll("#allClubsList .club-card-custom");

    clubCards.forEach(card => {
        const clubName = card.querySelector("strong").textContent;
        const btn = card.querySelector(".btn");

        if (joinedClubs.includes(clubName)) {
            btn.textContent = "Joined ✔";
            btn.classList.remove("btn-outline");
            btn.classList.add("btn-primary");
            btn.disabled = true;
        } else {
            btn.textContent = "Join Club";
            btn.classList.add("btn-outline");
            btn.classList.remove("btn-primary");
            btn.disabled = false;
        }
    });
}

// Load user skills from SQL database and populate dashboard list
async function loadUserSkillsFromDb() {
    if (!currentUser || !currentUser.id) return;
    const cfg = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.student;
    const listEl = document.getElementById(cfg.skillListId);
    if (!listEl) return;
    try {
        const res = await authFetch(`${API_BASE}/api/user/${currentUser.id}/skills`);
        const data = await res.json();
        if (!data.success || !data.skills || !data.skills.length) return;
        listEl.innerHTML = '';
        data.skills.forEach(s => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.dataset.level = (s.proficiency_level || 'intermediate').toLowerCase();
            tag.dataset.category = s.category || 'programming';
            tag.innerHTML = `${s.name}<span class="skill-level-badge">${(s.proficiency_level || 'Intermediate').replace(/^\w/, c => c.toUpperCase())}</span>`;
            listEl.appendChild(tag);
        });
        if (cfg.skillCountId) {
            const countEl = document.getElementById(cfg.skillCountId);
            if (countEl) countEl.textContent = data.skills.length;
        }
        setTimeout(initializeSkills, 50);
    } catch (err) {
        console.error('Load skills error:', err);
    }
}

//gemini ai enhance btn helpers
async function getGeminiSkillSuggestions(skills) {
    try {
        const res = await fetch(`${API_BASE}/ai/skills`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ skills })
        });

        const data = await res.json();
        if (data.success) {
            return data.suggestions;
        } else {
            return "AI backend error.";
        }
    } catch (err) {
        console.error("Gemini call error:", err);
        return "Unable to reach AI backend.";
    }
}

function fixAISuggestions(text) {
    if (!text) return "";

    text = text.replace(/\r\n/g, "\n");

    let lines = text.split("\n");
    let html = "";
    let inList = false;

    lines.forEach(line => {
        let trimmed = line.trim();

        // STEP 1: Detect bullets first (so italic conversion doesn't break them)
        if (/^[\*\-\•\‣\·]\s+/.test(trimmed)) {
            if (!inList) {
                html += "<ul>";
                inList = true;
            }
            // Remove bullet symbol (*, -, •, etc.)
            let withoutBullet = trimmed.replace(/^[\*\-\•\‣\·]\s+/, "");

            // Convert markdown bold after removing bullet
            withoutBullet = withoutBullet.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

            // Convert markdown italic (*text* or _text_)
            withoutBullet = withoutBullet.replace(/_(.*?)_/g, "<em>$1</em>");
            withoutBullet = withoutBullet.replace(/\*(.*?)\*/g, "<em>$1</em>");

            html += `<li>${withoutBullet}</li>`;
        }
        else if (trimmed === "") {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            html += "<br>";
        }
        else {
            if (inList) {
                html += "</ul>";
                inList = false;
            }

            let clean = trimmed;

            // Convert bold & italic in non-bullet text
            clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            clean = clean.replace(/_(.*?)_/g, "<em>$1</em>");
            clean = clean.replace(/\*(.*?)\*/g, "<em>$1</em>");

            html += `<p>${clean}</p>`;
        }
    });

    if (inList) html += "</ul>";

    return html;
}

//enhance btn model
function createEnhanceModal() {
    const modalHTML = `
        <div class="modal-overlay" id="enhanceModal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>AI Skill Enhancement Suggestions</h3>
                    <button class="modal-close" id="closeEnhanceModal">&times;</button>
                </div>
                <div class="modal-body" id="enhanceContent">
                    <p style="color: var(--gray);">Analyzing your skills...</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="closeEnhanceBtn">Close</button>
                </div>
            </div>
        </div>
    `;
    // prevent duplicate
    if (!document.getElementById('enhanceModal')) {
        document.body.insertAdjacentHTML("beforeend", modalHTML);
        document.getElementById("closeEnhanceModal").addEventListener("click", closeEnhanceModal);
        document.getElementById("closeEnhanceBtn").addEventListener("click", closeEnhanceModal);
    }
}

function closeEnhanceModal() {
    const modal = document.getElementById("enhanceModal");
    if (modal) modal.style.display = "none";
}

//example profile and demo btns
document.getElementById('addStudentSkillBtn')?.addEventListener('click', openSkillModal);

document.getElementById('editStudentProfileBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    const name = prompt('Enter your name:', currentUser.name);
    if (name) {
        currentUser.name = name;
        document.getElementById('studentName').textContent = name;
    }
    const title = prompt('Enter your title:', currentUser.title);
    if (title) {
        currentUser.title = title;
        document.getElementById('studentTitle').textContent = title;
    }
});

document.getElementById('connectStudentGithubBtn')?.addEventListener('click', async () => {
    if (!currentUser) return showNotification('Please login first', 'error');
    try {
        const res = await authFetch(`${API_BASE}/api/auth/github`);
        const data = await res.json();
        if (data.success && data.url) {
            window.location.href = data.url;
        } else {
            showNotification(data.error || 'Failed to initialize GitHub connection', 'error');
        }
    } catch (err) {
        showNotification('Network error initializing OAuth', 'error');
    }
});

document.getElementById('connectStudentLinkedinBtn')?.addEventListener('click', async () => {
    if (!currentUser) return showNotification('Please login first', 'error');
    try {
        const res = await authFetch(`${API_BASE}/api/auth/linkedin`);
        const data = await res.json();
        if (data.success && data.url) {
            window.location.href = data.url;
        } else {
            showNotification(data.error || 'Failed to initialize LinkedIn connection', 'error');
        }
    } catch (err) {
        showNotification('Network error initializing OAuth', 'error');
    }
});

// Check for OAuth redirect success on load
const urlParams = new URLSearchParams(window.location.search);
const oauthSuccess = urlParams.get('oauth_success');
if (oauthSuccess) {
    setTimeout(() => {
        showNotification(`Successfully connected ${oauthSuccess === 'github' ? 'GitHub' : 'LinkedIn'} account!`, 'success');
    }, 500);
    window.history.replaceState({}, document.title, window.location.pathname);
}

document.getElementById('exploreClubsBtn')?.addEventListener('click', () => {
    showPage('clubs');
    navLinks.forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-page="clubs"]').classList.add('active');
});

// Click outside modals to close
document.addEventListener('click', (e) => {
    const skillModal = document.getElementById('skillModal');
    if (skillModal && e.target === skillModal) closeSkillModal();
});

// Simple accept/decline for generic connection requests (not project)
function acceptRequest(button) {
    const requestItem = button.closest('.request-item');
    const name = requestItem.querySelector('.post-user').textContent;

    requestItem.style.opacity = "0";
    setTimeout(() => requestItem.remove(), 300);

    showNotification(`You are now connected with ${name}`, 'success');
}

function declineRequest(button) {
    const requestItem = button.closest('.request-item');
    const name = requestItem.querySelector('.post-user').textContent;

    requestItem.style.opacity = "0";
    setTimeout(() => requestItem.remove(), 300);

    showNotification(`You declined ${name}'s request`, 'error');
}

//project collab page
// In-memory store
let pc_projects = [];
let pc_requests = [];

//incroming request
function pc_renderIncomingRequests() {
    const container = document.getElementById('incomingRequestsList');
    if (!container) return;
    container.innerHTML = "";

    const myName = currentUser ? currentUser.name : "You";

    const mine = pc_requests.filter(r => {
        const proj = pc_projects.find(p => p.id === r.projectId);
        return proj && proj.owner === myName;
    });

    if (mine.length === 0) {
        container.innerHTML = `<div class="no-requests">No incoming requests yet.</div>`;
        return;
    }

    mine.forEach(r => {
        const proj = pc_projects.find(p => p.id === r.projectId);

        container.innerHTML += `
        <div class="request-card clean-request-card" data-request-id="${r.id}">
            
            <div class="req-top">
                <div>
                    <div class="req-name">${r.applicantName}</div>
                    <div class="req-project">applied for <strong>${proj.title}</strong></div>
                </div>

                <button class="btn btn-outline btn-small pc-analyse-btn" data-request-id="${r.id}">
                    Analyse Skill
                </button>
            </div>

            <div class="req-comment">${r.comment || ""}</div>

            <div class="req-skills-text">
                <strong>Skills:</strong> ${r.skills.join(", ")}
            </div>

            <a href="${r.github}" target="_blank" class="btn btn-outline btn-small req-github-btn">
                GitHub
            </a>

            <div class="req-actions">
                <button class="btn btn-primary btn-small pc-accept-btn" data-request-id="${r.id}">
                    Accept
                </button>
                <button class="btn btn-danger btn-small pc-decline-btn" data-request-id="${r.id}">
                    Decline
                </button>
            </div>

        </div>
        `;
    });
}

//own projects
function pc_renderMyProjects() {
    const container = document.getElementById('myProjectsList');
    if (!container) return;

    container.innerHTML = "";
    const myName = currentUser ? currentUser.name : "You";

    const mine = pc_projects.filter(p => p.owner === myName);

    if (mine.length === 0) {
        container.innerHTML = `
        <div class="project-card-custom no-projects-msg" style="color:var(--gray); padding:12px;">
            You haven't posted any projects yet. Use the form on the right to add a project.
        </div>`;
        return;
    }

    mine.forEach(p => {
        const team = (p.team || []).map(m => `<span class="skill-tag">${m}</span>`).join("");

        container.innerHTML += `
        <div class="project-card-custom">
            <strong>${p.title}</strong>
            <div style="color: var(--gray); font-size:0.9rem; margin-top:6px;">
                ${p.description}
            </div>

            <div style="margin-top:10px;">
                <strong>Skills:</strong> ${p.skills.join(", ")}
            </div>

            <div style="margin-top:8px;">
                <strong>Roles Needed:</strong> ${p.roles || "None"}
            </div>

            <div style="margin-top:8px;">
                <strong>Team:</strong> ${team || '<span style="color:var(--gray)">No members yet</span>'}
            </div>

            ${p.github ? `
            <div style="margin-top:8px;">
                <a href="${p.github}" class="btn btn-outline btn-small" target="_blank">GitHub</a>
            </div>` : ""}
        </div>
        `;
    });
}

//projcet feed list
function pc_renderProjectFeed() {
    const container = document.getElementById('projectFeedList');
    if (!container) return;

    container.innerHTML = "";
    const myName = currentUser ? currentUser.name : "You";

    const others = pc_projects.filter(p => p.owner !== myName);

    if (others.length === 0) {
        container.innerHTML =
            `<div class="project-card-custom" style="color:var(--gray);">No projects posted by others yet.</div>`;
        return;
    }

    others.forEach(p => {
        container.innerHTML += `
        <div class="project-card-custom">
            <div class="project-owner">
                <div class="avatar">${p.owner.charAt(0)}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;">${p.title}</div>
                    <div style="color:var(--gray); font-size:0.9rem;">by ${p.owner}</div>
                </div>
                <button class="btn btn-primary pc-apply-btn" data-project-id="${p.id}">
                    Apply to Join
                </button>
            </div>

            <div style="color: var(--gray); margin-top:8px;">${p.description}</div>

            <div style="margin-top:8px;">
                <strong>Skills:</strong> ${p.skills.join(", ")}
            </div>

            <div style="margin-top:8px;">
                <strong>Roles:</strong> ${p.roles || "None"}
            </div>
        </div>
        `;
    });
}


// Post Project via API
document.getElementById('pc_postProjectBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('pc_projTitle')?.value.trim();
    const desc = document.getElementById('pc_projDesc')?.value.trim();
    const github = document.getElementById('pc_projGithub')?.value.trim();

    if (!title || !desc) {
        showNotification("Please enter project title and description", "error");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc, github_repo_url: github })
        });
        const data = await res.json();
        if (data.success) {
            showNotification("Project posted!", "success");
            document.getElementById('pc_projTitle').value = "";
            document.getElementById('pc_projDesc').value = "";
            document.getElementById('pc_projGithub').value = "";
            await pc_onProjectsPageShow();
            loadUserStats();
        } else {
            showNotification(data.error || "Failed to post project", "error");
        }
    } catch(e) {
        showNotification("Network error", "error");
    }
});


//join btn
document.addEventListener('click', (e) => {
    if (e.target.closest('.pc-apply-btn')) {
        const btn = e.target.closest('.pc-apply-btn');
        const projId = btn.getAttribute('data-project-id');

        if (!currentUser) {
            showNotification("Login to apply", "error");
            return;
        }

        const name = currentUser.name;
        const github = prompt("Your GitHub link?", "");
        const comment = prompt("How will you contribute?", "");
        const skills = (prompt("Your skills (comma separated):", "") || "")
            .split(",").map(s => s.trim()).filter(Boolean);

        const req = {
            id: "req_" + Date.now(),
            projectId: projId,
            applicantName: name,
            github,
            comment,
            skills
        };

        pc_requests.unshift(req);

        btn.innerHTML = "Requested ✓";
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline");
        btn.disabled = true;

        pc_renderIncomingRequests();
        pc_renderMyProjects();

        showNotification("Request sent!", "success");
    }
});

document.addEventListener('click', (e) => {
    // ACCEPT
    if (e.target.closest('.pc-accept-btn')) {
        const id = e.target.getAttribute('data-request-id');
        const req = pc_requests.find(r => r.id === id);
        const proj = pc_projects.find(p => p.id === req.projectId);

        proj.team.push(req.applicantName);
        pc_requests = pc_requests.filter(r => r.id !== id);

        pc_renderMyProjects();
        pc_renderIncomingRequests();
        pc_renderProjectFeed();

        showNotification(`${req.applicantName} added to team!`, "success");
    }

    // DECLINE
    if (e.target.closest('.pc-decline-btn')) {
        const id = e.target.getAttribute('data-request-id');
        pc_requests = pc_requests.filter(r => r.id !== id);

        pc_renderMyProjects();
        pc_renderIncomingRequests();

        showNotification("Request declined", "error");
    }

    //analyse bug fixing
    if (e.target.closest('.pc-analyse-btn')) {
        const id = e.target.closest('.pc-analyse-btn').getAttribute('data-request-id');
        const req = pc_requests.find(r => r.id === id);
        if (!req) return;

        pc_openAnalyseModal(req);
    }
});

//analyse button model functionlity
function pc_openAnalyseModal(req) {
    const modal = document.getElementById('pc_analyseModal');
    const content = document.getElementById('pc_analyseContent');
    modal.style.display = "flex";

    content.innerHTML = `<p style="color:var(--gray);">Analyzing ${req.applicantName}...</p>`;

    fetch(`${API_BASE}/ai/analyse-collab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            applicantGithub: req.github,
            requiredSkills: req.skills,
            applicantName: req.applicantName
        })
    })
        .then(r => r.json())
        .then(data => {
            content.innerHTML = `
            <strong>Match Score:</strong> ${data.matchScore}<br>
            <strong>Repo Quality:</strong> ${data.repoQuality}<br>
            <strong>Recommendation:</strong> ${data.recommendation}<br><br>

            <strong>Strengths:</strong>
            <ul>${data.strengths.map(s => `<li>${s}</li>`).join("")}</ul>

            <strong>Weaknesses:</strong>
            <ul>${data.weaknesses.map(s => `<li>${s}</li>`).join("")}</ul>

            <strong>Details:</strong>
            <div style="margin-top:6px;">${data.details}</div>
            `;

            content.innerHTML += `
<br>
<strong>Conclusion:</strong>
<p style="margin-top:6px;">${data.conclusion}</p>
`;

        })
        .catch(() => {
            content.innerHTML = `<p style="color:red;">Unable to reach backend.</p>`;
        });
}

document.getElementById('pc_closeAnalyseModal')?.addEventListener('click', () => {
    document.getElementById('pc_analyseModal').style.display = 'none';
});
document.getElementById('pc_closeAnalyseBtn')?.addEventListener('click', () => {
    document.getElementById('pc_analyseModal').style.display = 'none';
});

// ---- Project Collaboration Page (API-backed) ----
async function pc_onProjectsPageShow() {
    await pc_renderMyProjects();
    await pc_renderProjectFeed();
    await pc_renderIncomingRequests();
}

async function pc_renderMyProjects() {
    const container = document.getElementById('myProjectsList');
    if (!container) return;
    container.innerHTML = '<div style="color:var(--gray);padding:12px;">Loading...</div>';
    try {
        const res = await authFetch(`${API_BASE}/api/user/${currentUser.id}/projects`);
        const data = await res.json();
        container.innerHTML = '';
        if (!data.success || !data.projects.length) {
            container.innerHTML = '<div style="color:var(--gray);padding:12px;">You have not posted any projects yet. Use the form to add one.</div>';
            return;
        }
        data.projects.forEach(p => {
            const pending = p.pending_applications || 0;
            container.innerHTML += `
            <div class="project-card-custom">
                <strong>${p.title}</strong>
                <div style="color:var(--gray);font-size:0.9rem;margin-top:6px;">${p.description}</div>
                ${p.github_repo_url ? `<div style="margin-top:8px;"><a href="${p.github_repo_url}" class="btn btn-outline btn-small" target="_blank">GitHub</a></div>` : ''}
                <div style="margin-top:8px;font-size:0.85rem;">
                    <strong>Status:</strong> ${p.status} &bull; <strong>Applications</strong>: ${pending} pending
                </div>
                <div style="margin-top:8px;">
                    <button class="btn btn-outline btn-small pc-view-apps-btn" data-project-id="${p.id}" data-project-title="${p.title}">View Applications</button>
                </div>
            </div>`;
        });
        document.querySelectorAll('.pc-view-apps-btn').forEach(btn => {
            btn.addEventListener('click', () => pc_openApplicationsModal(btn.dataset.projectId, btn.dataset.projectTitle));
        });
    } catch(e) {
        container.innerHTML = '<div style="color:red;padding:12px;">Failed to load projects.</div>';
    }
}

async function pc_renderProjectFeed() {
    const container = document.getElementById('projectFeedList');
    if (!container) return;
    container.innerHTML = '<div style="color:var(--gray);padding:12px;">Loading...</div>';
    try {
        const res = await authFetch(`${API_BASE}/api/projects`);
        const data = await res.json();
        container.innerHTML = '';
        const others = (data.projects || []).filter(p => p.owner_id !== currentUser.id);
        if (!others.length) {
            container.innerHTML = '<div style="color:var(--gray);padding:12px;">No projects from others yet.</div>';
            return;
        }
        others.forEach(p => {
            container.innerHTML += `
            <div class="project-card-custom">
                <div class="project-owner" style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <div class="avatar" style="width:36px;height:36px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${(p.owner_name||'?').charAt(0)}</div>
                    <div>
                        <div style="font-weight:600;">${p.title}</div>
                        <div style="color:var(--gray);font-size:0.85rem;">by ${p.owner_name}</div>
                    </div>
                </div>
                <div style="color:var(--gray);">${p.description}</div>
                ${p.github_repo_url ? `<div style="margin-top:8px;"><a href="${p.github_repo_url}" class="btn btn-outline btn-small" target="_blank">GitHub</a></div>` : ''}
                <div style="margin-top:10px;">
                    <button class="btn btn-primary btn-small pc-apply-btn" data-id="${p.id}">Apply to Join</button>
                </div>
            </div>`;
        });
        document.querySelectorAll('.pc-apply-btn').forEach(btn => {
            btn.addEventListener('click', () => pc_openApplyModal(btn.dataset.id));
        });
    } catch(e) {
        container.innerHTML = '<div style="color:red;padding:12px;">Failed to load project feed.</div>';
    }
}

async function pc_renderIncomingRequests() {
    const container = document.getElementById('incomingRequestsList');
    if (!container) return;
    container.innerHTML = '<div style="color:var(--gray);padding:12px;">Loading...</div>';
    // Applications across all MY projects
    try {
        const res = await authFetch(`${API_BASE}/api/user/${currentUser.id}/projects`);
        const pData = await res.json();
        container.innerHTML = '';
        if (!pData.success || !pData.projects.length) {
            container.innerHTML = '<div style="color:var(--gray);padding:12px;">No incoming requests yet.</div>';
            return;
        }
        let found = false;
        for (const proj of pData.projects) {
            const aRes = await authFetch(`${API_BASE}/api/projects/${proj.id}/applications`);
            const aData = await aRes.json();
            const pending = (aData.applications || []).filter(a => a.status === 'pending');
            pending.forEach(a => {
                found = true;
                container.innerHTML += `
                <div class="request-card clean-request-card" data-app-id="${a.id}" data-project-id="${proj.id}">
                    <div class="req-top" style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div class="req-name" style="font-weight:700;">${a.applicant_name}</div>
                            <div class="req-project" style="font-size:0.85rem;color:var(--gray);">applied for <strong>${proj.title}</strong></div>
                        </div>
                        <button class="btn btn-outline btn-small pc-analyse-btn" data-github="${a.applicant_github||''}" data-name="${a.applicant_name}">Analyse</button>
                    </div>
                    <div class="req-comment" style="margin-top:8px;font-size:0.9rem;color:var(--gray);">${a.message||''}</div>
                    ${a.github_link ? `<a href="${a.github_link}" target="_blank" class="btn btn-outline btn-small" style="margin-top:8px;">GitHub</a>` : ''}
                    <div class="req-actions" style="margin-top:10px;display:flex;gap:8px;">
                        <button class="btn btn-primary btn-small pc-accept-req" data-app-id="${a.id}" data-project-id="${proj.id}">Accept</button>
                        <button class="btn btn-danger btn-small pc-decline-req" data-app-id="${a.id}" data-project-id="${proj.id}">Decline</button>
                    </div>
                </div>`;
            });
        }
        if (!found) container.innerHTML = '<div style="color:var(--gray);padding:12px;">No incoming requests yet.</div>';

        // Bind accept/decline
        container.querySelectorAll('.pc-accept-req').forEach(btn => {
            btn.addEventListener('click', async () => {
                await updateAppStatus(btn.dataset.appId, btn.dataset.projectId, 'accepted');
            });
        });
        container.querySelectorAll('.pc-decline-req').forEach(btn => {
            btn.addEventListener('click', async () => {
                await updateAppStatus(btn.dataset.appId, btn.dataset.projectId, 'declined');
            });
        });
        container.querySelectorAll('.pc-analyse-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pc_openAnalyseModal({ applicantName: btn.dataset.name, github: btn.dataset.github, skills: [] });
            });
        });
    } catch(e) {
        container.innerHTML = '<div style="color:red;padding:12px;">Failed to load requests.</div>';
    }
}

async function updateAppStatus(appId, projectId, status) {
    try {
        const res = await authFetch(`${API_BASE}/api/projects/${projectId}/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`Application ${status}!`, status === 'accepted' ? 'success' : 'error');
            pc_renderIncomingRequests();
            pc_renderMyProjects();
            loadUserStats();
        } else {
            showNotification(data.error || 'Failed', 'error');
        }
    } catch(e) {
        showNotification('Network error', 'error');
    }
}

function pc_openApplyModal(projectId) {
    const msg = prompt('Why do you want to join this project?', '');
    const ghLink = prompt('Your GitHub link (optional):', currentUser.github_url || '');
    if (msg === null) return;
    authFetch(`${API_BASE}/api/projects/${projectId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, github_link: ghLink || '' })
    }).then(r => r.json()).then(data => {
        if (data.success) {
            showNotification('Application sent!', 'success');
            pc_renderProjectFeed();
        } else {
            showNotification(data.error || 'Failed to apply', 'error');
        }
    }).catch(() => showNotification('Network error', 'error'));
}

async function pc_openApplicationsModal(projectId, projectTitle) {
    const modal = document.getElementById('pc_analyseModal');
    const content = document.getElementById('pc_analyseContent');
    if (!modal || !content) return;
    modal.style.display = 'flex';
    content.innerHTML = `<p style="color:var(--gray);">Loading applications for <strong>${projectTitle}</strong>...</p>`;
    try {
        const res = await authFetch(`${API_BASE}/api/projects/${projectId}/applications`);
        const data = await res.json();
        const apps = data.applications || [];
        if (!apps.length) {
            content.innerHTML = '<p style="color:var(--gray);">No applications yet.</p>';
            return;
        }
        content.innerHTML = `<h4 style="margin-bottom:12px;">Applications for ${projectTitle}</h4>` +
            apps.map(a => `
            <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px;">
                <strong>${a.applicant_name}</strong> <span style="color:var(--gray);font-size:0.85rem;">(${a.status})</span><br>
                <span style="font-size:0.9rem;color:var(--gray);">${a.message||''}</span><br>
                ${a.github_link ? `<a href="${a.github_link}" target="_blank" style="font-size:0.85rem;">GitHub</a>` : ''}
            </div>`).join('');
    } catch(e) {
        content.innerHTML = '<p style="color:red;">Failed to load.</p>';
    }
}


//forcing skill buttons to work on loading of page
window.addEventListener("load", () => {
    console.log("INIT: Creating modals...");

    // Prevent multiple insertion, create if missing
    if (!document.getElementById("skillModal")) {
        console.log("Creating Skill Modal");
        createSkillModal();
    }

    if (!document.getElementById("enhanceModal")) {
        console.log("Creating Enhance Modal");
        createEnhanceModal();
    }

    // Attach modal closing support
    initializeExistingSkills();
});

// Faculty-specific event handlers
document.getElementById('editFacultyProfileBtn')?.addEventListener('click', function () {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }

    const name = prompt('Enter your name:', currentUser.name);
    if (name) {
        currentUser.name = name;
        document.getElementById('facultyName').textContent = name;
    }

    const title = prompt('Enter your title:', currentUser.title);
    if (title) {
        currentUser.title = title;
        document.getElementById('facultyTitle').textContent = title;
    }
});

// Faculty action buttons event delegation
document.addEventListener('click', function (e) {
    // Project approval
    if (e.target.closest('.approve-project-btn')) {
        const projectId = e.target.closest('.approve-project-btn').getAttribute('data-project-id');
        const projectCard = e.target.closest('.project-card-custom');

        projectCard.querySelector('.project-status').textContent = 'Approved';
        projectCard.querySelector('.project-status').className = 'project-status status-approved';

        // Replace approval buttons with view/message buttons
        const actionButtons = projectCard.querySelector('.action-buttons');
        actionButtons.innerHTML = `
            <button class="btn btn-primary btn-small view-project-btn" data-project-id="${projectId}">
                <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn btn-outline btn-small message-student-btn" data-student="Student Name">
                <i class="fas fa-comment"></i> Message
            </button>
        `;

        showNotification('Project approved successfully!', 'success');
    }

    // Project rejection
    if (e.target.closest('.reject-project-btn')) {
        const projectId = e.target.closest('.reject-project-btn').getAttribute('data-project-id');
        const projectCard = e.target.closest('.project-card-custom');

        projectCard.querySelector('.project-status').textContent = 'Rejected';
        projectCard.querySelector('.project-status').className = 'project-status status-rejected';

        // Replace rejection buttons with view button only
        const actionButtons = projectCard.querySelector('.action-buttons');
        actionButtons.innerHTML = `
            <button class="btn btn-primary btn-small view-project-btn" data-project-id="${projectId}">
                <i class="fas fa-eye"></i> View Details
            </button>
        `;

        showNotification('Project rejected', 'error');
    }

    // Collaboration request acceptance
    if (e.target.closest('.accept-collab-btn')) {
        const requestId = e.target.closest('.accept-collab-btn').getAttribute('data-request-id');
        const requestCard = e.target.closest('.collaboration-request');

        // Update UI
        requestCard.style.borderLeftColor = '#28a745';
        requestCard.querySelector('.action-buttons').innerHTML = `
            <span style="color: var(--success); font-weight: 600;">
                <i class="fas fa-check"></i> Collaboration Accepted
            </span>
        `;

        showNotification('Collaboration request accepted!', 'success');
    }

    // Collaboration request decline
    if (e.target.closest('.decline-collab-btn')) {
        const requestId = e.target.closest('.decline-collab-btn').getAttribute('data-request-id');
        const requestCard = e.target.closest('.collaboration-request');

        // Fade out and remove
        requestCard.style.opacity = '0.5';
        setTimeout(() => {
            requestCard.remove();
        }, 500);

        showNotification('Collaboration request declined', 'error');
    }

    // View project details
    if (e.target.closest('.view-project-btn')) {
        const projectId = e.target.closest('.view-project-btn').getAttribute('data-project-id');
        alert(`Viewing details for project ID: ${projectId}`);
    }

    // Message student/author
    if (e.target.closest('.message-student-btn') || e.target.closest('.message-author-btn')) {
        const name = e.target.closest('button').getAttribute('data-student') ||
            e.target.closest('button').getAttribute('data-author');
        alert(`Opening messaging interface with ${name}`);
    }
});

//generalization common functions
/* =========================================================
   UNIFIED ROLE CONFIGURATION
========================================================= */
const ROLE_CONFIG = {
    student: {
        dashboardId: 'student-dashboard',
        nameId: 'studentName',
        titleId: 'studentTitle',
        skillListId: 'studentSkillsList',
        skillCountId: 'studentSkills',
        addSkillBtnId: 'addStudentSkillBtn',
        aiBtnId: 'enhanceSkillBtn',
        modalAddTitle: 'Add New Skill',
        modalAddBtn: 'Add Skill',
        defaultCategory: 'programming'
    },
    faculty: {
        dashboardId: 'faculty-dashboard',
        nameId: 'facultyName',
        titleId: 'facultyTitle',
        skillListId: 'facultyResearchAreas',
        skillCountId: null,
        addSkillBtnId: 'addResearchAreaBtn',
        aiBtnId: 'analyzeResearchBtn',
        modalAddTitle: 'Add Research Area',
        modalAddBtn: 'Add Research Area',
        defaultCategory: 'research'
    }
};

/* =========================================================
   SKILL INITIALIZER (FIXES FACULTY CLICK BUG)
========================================================= */
function initializeSkills() {
    const cfg = ROLE_CONFIG[currentRole];
    const list = document.getElementById(cfg.skillListId);
    if (!list) return;

    list.querySelectorAll('.skill-tag').forEach(skill => {
        if (!skill.dataset.bound) {
            skill.dataset.bound = "true";
            skill.addEventListener('click', e => {
                e.stopPropagation();
                openEditSkillModal(skill);
            });
        }
    });
}

/* =========================================================
   ROLE-AWARE SKILL MODAL
========================================================= */
function openSkillModal() {
    const cfg = ROLE_CONFIG[currentRole];
    const modalTitle = document.getElementById('modalTitle');
    const saveSkillBtn = document.getElementById('saveSkillBtn');
    const deleteSection = document.getElementById('deleteSection');
    const skillName = document.getElementById('skillName');
    const skillLevel = document.getElementById('skillLevel');
    const skillCategory = document.getElementById('skillCategory');
    const skillModal = document.getElementById('skillModal');

    if (!skillModal) {
        createSkillModal();
        // Wait for modal to be created
        setTimeout(() => openSkillModal(), 100);
        return;
    }

    editingSkill = null;

    modalTitle.textContent = cfg.modalAddTitle;
    saveSkillBtn.textContent = cfg.modalAddBtn;
    deleteSection.style.display = 'none';

    skillName.value = '';
    skillLevel.value = 'intermediate';
    skillCategory.value = cfg.defaultCategory;

    updateSkillPreview();
    skillModal.style.display = 'flex';
}

/* =========================================================
   ROLE-AWARE SAVE SKILL
========================================================= */
async function saveSkill() {
    const cfg = ROLE_CONFIG[currentRole];
    const skillName = document.getElementById('skillName');
    const skillLevel = document.getElementById('skillLevel');
    const skillCategory = document.getElementById('skillCategory');

    const name = skillName.value.trim();
    const level = skillLevel.value;
    const category = skillCategory.value;

    if (!name) return alert('Enter a skill name');

    if (editingSkill) {
        editingSkill.innerHTML = `
            ${name}
            <span class="skill-level-badge">${level.charAt(0).toUpperCase() + level.slice(1)}</span>
        `;
        editingSkill.dataset.level = level;
        editingSkill.dataset.category = category;
        showNotification('Skill updated!', 'success');
    } else {
        if (currentUser?.id) {
            try {
                const res = await fetch(`${API_BASE}/api/user/${currentUser.id}/skills`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, category, proficiency_level: level })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to save');
            } catch (err) {
                console.error(err);
                showNotification('Could not save to database', 'error');
                closeSkillModal();
                return;
            }
        }
        const skill = document.createElement('span');
        skill.className = 'skill-tag';
        skill.dataset.level = level;
        skill.dataset.category = category;
        skill.innerHTML = `
            ${name}
            <span class="skill-level-badge">${level.charAt(0).toUpperCase() + level.slice(1)}</span>
        `;

        document.getElementById(cfg.skillListId).appendChild(skill);

        if (cfg.skillCountId) {
            const count = document.getElementById(cfg.skillCountId);
            count.textContent = parseInt(count.textContent, 10) + 1;
        }

        showNotification('Skill added!', 'success');
    }

    closeSkillModal();
    initializeSkills();
}

/* =========================================================
   UNIFIED AI ANALYSIS (STUDENT + FACULTY)
========================================================= */
async function runAIAnalysis() {
    const cfg = ROLE_CONFIG[currentRole];
    const enhanceModal = document.getElementById('enhanceModal');
    const enhanceContent = document.getElementById('enhanceContent');
    
    if (!enhanceModal) {
        createEnhanceModal();
        setTimeout(() => runAIAnalysis(), 100);
        return;
    }
    
    enhanceModal.style.display = 'flex';
    enhanceContent.innerHTML = `<p style="color:var(--gray)">Analyzing...</p>`;

    const items = [];
    document.querySelectorAll(`#${cfg.skillListId} .skill-tag`).forEach(tag => {
        items.push({
            name: tag.childNodes[0].textContent.trim(),
            level: tag.dataset.level || 'intermediate'
        });
    });

    const aiOutput = await getGeminiSkillSuggestions(items);
    enhanceContent.innerHTML = `
        <h4>AI Insights</h4>
        <div style="line-height:1.6; margin-top:8px;">
            ${fixAISuggestions(aiOutput)}
        </div>
    `;
}

/* =========================================================
   BIND BUTTONS (ONCE)
========================================================= */
Object.values(ROLE_CONFIG).forEach(cfg => {
    document.getElementById(cfg.addSkillBtnId)?.addEventListener('click', openSkillModal);
    document.getElementById(cfg.aiBtnId)?.addEventListener('click', runAIAnalysis);
});

// Initialize LinkedIn buttons
function initializeLinkedInButtons() {
    // Student LinkedIn buttons
    const studentConnectBtn = document.getElementById('connectStudentLinkedinBtn');
    const studentViewBtn = document.getElementById('viewStudentLinkedinBtn');
    
    if (studentConnectBtn) {
        studentConnectBtn.addEventListener('click', () => {
            connectLinkedIn('student');
        });
    }
    
    if (studentViewBtn) {
        studentViewBtn.addEventListener('click', () => {
            viewLinkedInProfile('student');
        });
    }
    
    // Faculty LinkedIn buttons
    const facultyConnectBtn = document.getElementById('connectFacultyLinkedinBtn');
    const facultyViewBtn = document.getElementById('viewFacultyLinkedinBtn');
    
    if (facultyConnectBtn) {
        facultyConnectBtn.addEventListener('click', () => {
            connectLinkedIn('faculty');
        });
    }
    
    if (facultyViewBtn) {
        facultyViewBtn.addEventListener('click', () => {
            viewLinkedInProfile('faculty');
        });
    }
    
    // Update initial state
    updateLinkedInUI('student');
    updateLinkedInUI('faculty');
}

// Connect LinkedIn function
function connectLinkedIn(role) {
    const profileName = role === 'student' 
        ? currentUser?.name || 'Student User' 
        : currentUser?.name || 'Faculty Member';
    
    // Simulate LinkedIn OAuth flow
    const linkedinUrl = prompt(
        `Enter your LinkedIn profile URL for ${profileName}:\n\nExample: https://www.linkedin.com/in/yourusername`,
        `https://www.linkedin.com/in/${profileName.toLowerCase().replace(/\s+/g, '-')}`
    );
    
    if (linkedinUrl) {
        // Validate URL format
        if (linkedinUrl.includes('linkedin.com/in/')) {
            // Simulate successful connection
            linkedinProfiles[role] = {
                connected: true,
                profileUrl: linkedinUrl,
                connections: Math.floor(Math.random() * 500) + 100,
                followers: Math.floor(Math.random() * 1000) + 50,
                profileData: {
                    headline: role === 'student' ? 'Computer Science Student' : 'AI Research Faculty',
                    location: 'University Campus',
                    joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }
            };
            
            // Update UI
            updateLinkedInUI(role);
            
            // Show success notification
            showNotification(`${role.charAt(0).toUpperCase() + role.slice(1)} LinkedIn profile connected!`, 'success');
        } else {
            alert('Please enter a valid LinkedIn profile URL (should contain linkedin.com/in/)');
        }
    }
}

// View LinkedIn profile
function viewLinkedInProfile(role) {
    const profile = linkedinProfiles[role];
    
    if (profile.connected && profile.profileUrl) {
        // In a real app, this would open the LinkedIn profile
        // For demo, show a modal with profile info
        const profileName = role === 'student' 
            ? currentUser?.name || 'Student User' 
            : currentUser?.name || 'Faculty Member';
        
        const modalContent = `
            <div style="text-align: left;">
                <h3 style="color: #0077B5; margin-bottom: 15px;">
                    <i class="fab fa-linkedin"></i> LinkedIn Profile
                </h3>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="font-weight: 600; font-size: 1.1rem; color: #0077B5; margin-bottom: 5px;">
                        ${profileName}
                    </div>
                    <div style="color: var(--gray); margin-bottom: 10px;">
                        ${profile.profileData.headline}
                    </div>
                    <div style="font-size: 0.9rem; color: #666;">
                        <i class="fas fa-map-marker-alt"></i> ${profile.profileData.location}
                    </div>
                </div>
                
                <div class="linkedin-stats">
                    <div class="linkedin-stat">
                        <div class="linkedin-stat-value">${profile.connections}+</div>
                        <div class="linkedin-stat-label">Connections</div>
                    </div>
                    <div class="linkedin-stat">
                        <div class="linkedin-stat-value">${profile.followers}</div>
                        <div class="linkedin-stat-label">Followers</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; font-size: 0.9rem;">
                    <strong>Profile URL:</strong>
                    <div class="profile-url" style="word-break: break-all; margin-top: 5px;">
                        <a href="${profile.profileUrl}" target="_blank">${profile.profileUrl}</a>
                    </div>
                </div>
                
                <div style="margin-top: 15px; font-size: 0.85rem; color: var(--gray);">
                    <i class="fas fa-info-circle"></i> In a real implementation, this would redirect to LinkedIn
                </div>
            </div>
        `;
        
        // Show modal with profile info
        if (confirm(`Open LinkedIn profile for ${profileName}?\n\nURL: ${profile.profileUrl}\n\nClick OK to see profile details`)) {
            // Create a simple modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="background: white; padding: 25px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #0077B5;">LinkedIn Profile Preview</h3>
                        <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--gray);">&times;</button>
                    </div>
                    ${modalContent}
                    <div style="margin-top: 20px; text-align: right;">
                        <button onclick="window.open('${profile.profileUrl}', '_blank'); this.closest('.modal-overlay').remove();" style="background: #0077B5; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                            Open in New Tab
                        </button>
                        <button onclick="this.closest('.modal-overlay').remove()" style="background: var(--gray); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.remove();
                }
            });
        }
    } else {
        showNotification('LinkedIn profile not connected yet', 'error');
    }
}

// Update LinkedIn UI based on connection status
function updateLinkedInUI(role) {
    const profile = linkedinProfiles[role];
    const statusElement = document.getElementById(`${role}LinkedinStatus`);
    const connectBtn = document.getElementById(`connect${role.charAt(0).toUpperCase() + role.slice(1)}LinkedinBtn`);
    const viewBtn = document.getElementById(`view${role.charAt(0).toUpperCase() + role.slice(1)}LinkedinBtn`);
    
    if (!statusElement || !connectBtn) return;
    
    if (profile.connected) {
        statusElement.innerHTML = `
            <span class="linkedin-connected">
                <i class="fas fa-check-circle"></i> Connected
            </span>
            <br>
            <small style="color: var(--gray);">Last synced: Just now</small>
        `;
        connectBtn.style.display = 'none';
        if (viewBtn) {
            viewBtn.style.display = 'block';
        }
    } else {
        statusElement.innerHTML = `
            <span class="linkedin-disconnected">
                <i class="fas fa-unlink"></i> Not connected
            </span>
            <br>
            <small style="color: var(--gray);">Connect to share your profile</small>
        `;
        connectBtn.style.display = 'block';
        if (viewBtn) {
            viewBtn.style.display = 'none';
        }
    }
}

// Sync LinkedIn data (simulated)
function syncLinkedInData(role) {
    if (linkedinProfiles[role].connected) {
        // Simulate syncing data
        const profile = linkedinProfiles[role];
        
        // Update some stats randomly
        profile.connections += Math.floor(Math.random() * 10);
        profile.followers += Math.floor(Math.random() * 5);
        
        // Update UI
        updateLinkedInUI(role);
        
        showNotification('LinkedIn data synced successfully!', 'success');
    } else {
        showNotification('Please connect LinkedIn first', 'error');
    }
}

// Initialize LinkedIn functionality when dashboard loads
function initializeLinkedInOnDashboardLoad() {
    if (currentRole) {
        // Update UI
        updateLinkedInUI(currentRole);
    }
}

// Initialize clubs page — fully dynamic from API
async function initializeClubsPage() {
    const allList = document.getElementById('allClubsList');
    const myList = document.getElementById('myClubsList');
    if (!allList) return;

    allList.innerHTML = '<div style="color:var(--gray);padding:20px;">Loading clubs...</div>';
    if (myList) myList.innerHTML = '';

    try {
        const res = await authFetch(`${API_BASE}/api/clubs`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const clubs = data.clubs;
        allList.innerHTML = '';
        if (myList) myList.innerHTML = '';

        if (clubs.length === 0) {
            allList.innerHTML = '<div style="color:var(--gray);padding:12px;">No clubs yet. Be the first to create one!</div>';
        }

        clubs.forEach(club => {
            const isMember = club.is_member;
            const card = document.createElement('div');
            card.className = 'club-card-custom';
            card.dataset.clubId = club.id;
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div>
                        <strong>${club.name}</strong>
                        ${club.category ? `<span class="skill-tag" style="font-size:0.75rem;padding:2px 8px;margin-left:6px;">${club.category}</span>` : ''}
                        <p style="color:var(--gray);font-size:0.9rem;margin-top:4px;">${club.description || ''}</p>
                        <small style="color:var(--gray);">${club.member_count} member${club.member_count !== 1 ? 's' : ''}</small>
                    </div>
                    <button class="btn ${isMember ? 'btn-primary' : 'btn-outline'} club-toggle-btn" data-club-id="${club.id}" data-club-name="${club.name}" ${isMember ? 'data-joined="true"' : ''}>
                        ${isMember ? 'Leave' : 'Join Club'}
                    </button>
                </div>
            `;
            allList.appendChild(card);

            if (isMember && myList) {
                const myCard = document.createElement('div');
                myCard.className = 'club-card-custom';
                myCard.innerHTML = `<strong>${club.name}</strong><p style="color:var(--gray);font-size:0.9rem;">Member &bull; ${club.member_count} members</p>`;
                myList.appendChild(myCard);
            }
        });

        // Bind join/leave
        allList.querySelectorAll('.club-toggle-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const cid = this.dataset.clubId;
                const cname = this.dataset.clubName;
                const joined = this.dataset.joined === 'true';
                const endpoint = joined ? 'leave' : 'join';
                try {
                    const r = await authFetch(`${API_BASE}/api/clubs/${cid}/${endpoint}`, { method: 'POST' });
                    const d = await r.json();
                    if (d.success) {
                        showNotification(joined ? `Left ${cname}` : `Joined ${cname}!`, joined ? 'error' : 'success');
                        initializeClubsPage();
                    } else {
                        showNotification(d.error || 'Failed', 'error');
                    }
                } catch(e) {
                    showNotification('Network error', 'error');
                }
            });
        });

    } catch(e) {
        console.error('Clubs load error', e);
        allList.innerHTML = '<div style="color:red;padding:12px;">Failed to load clubs.</div>';
    }
}

// Initialize events page — fully dynamic from API
async function initializeEventsPage() {
    const upcomingEl = document.getElementById('upcomingEventsList');
    const myEventsEl = document.getElementById('myEventsList');
    if (!upcomingEl) return;

    upcomingEl.innerHTML = '<div style="color:var(--gray);padding:20px;">Loading events...</div>';

    try {
        const res = await authFetch(`${API_BASE}/api/events`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const events = data.events;
        upcomingEl.innerHTML = '';
        if (myEventsEl) myEventsEl.innerHTML = '';

        const now = new Date();
        const upcoming = events.filter(e => new Date(e.start_time) >= now);
        const myEvents = events.filter(e => e.is_registered);

        if (upcoming.length === 0) {
            upcomingEl.innerHTML = '<div style="color:var(--gray);padding:12px;">No upcoming events. Create one below!</div>';
        }

        upcoming.forEach(ev => {
            const d = new Date(ev.start_time);
            const day = d.getDate();
            const month = d.toLocaleString('default', { month: 'short' });
            const time = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <div class="event-date">
                    <div class="event-day">${day}</div>
                    <div style="font-size:0.7rem;text-transform:uppercase;">${month}</div>
                </div>
                <div class="event-details" style="flex:1;">
                    <div class="event-title">${ev.title}</div>
                    <div class="event-time">${time}${ev.location ? ' &bull; ' + ev.location : ''}${ev.club_name ? ' &bull; ' + ev.club_name : ''}</div>
                    <div style="font-size:0.85rem;color:var(--gray);margin-top:2px;">${ev.description || ''}</div>
                    <div style="margin-top:8px;">
                        <button class="btn ${ev.is_registered ? 'btn-outline' : 'btn-primary'} btn-small event-reg-btn" 
                            data-event-id="${ev.id}" data-registered="${ev.is_registered}">
                            ${ev.is_registered ? 'Cancel Registration' : 'Register'} (${ev.registration_count})
                        </button>
                    </div>
                </div>
            `;
            upcomingEl.appendChild(card);
        });

        if (myEventsEl) {
            if (myEvents.length === 0) {
                myEventsEl.innerHTML = '<div style="color:var(--gray);padding:12px;">No events registered.</div>';
            } else {
                myEvents.forEach(ev => {
                    const d = new Date(ev.start_time);
                    const myCard = document.createElement('div');
                    myCard.className = 'event-card';
                    myCard.innerHTML = `
                        <div class="event-date"><div class="event-day">${d.getDate()}</div></div>
                        <div class="event-details"><div class="event-title">${ev.title}</div>
                        <div class="event-time">${d.toLocaleDateString()}</div></div>
                    `;
                    myEventsEl.appendChild(myCard);
                });
            }
        }

        // Bind register/unregister
        document.querySelectorAll('.event-reg-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const eid = this.dataset.eventId;
                const isReg = this.dataset.registered === '1' || this.dataset.registered === 'true';
                const endpoint = isReg ? 'unregister' : 'register';
                try {
                    const r = await authFetch(`${API_BASE}/api/events/${eid}/${endpoint}`, { method: 'POST' });
                    const d = await r.json();
                    if (d.success) {
                        showNotification(isReg ? 'Unregistered from event' : 'Registered for event!', isReg ? 'error' : 'success');
                        initializeEventsPage();
                    } else {
                        showNotification(d.error || 'Failed', 'error');
                    }
                } catch(e) {
                    showNotification('Network error', 'error');
                }
            });
        });

    } catch(e) {
        console.error('Events load error', e);
        upcomingEl.innerHTML = '<div style="color:red;padding:12px;">Failed to load events.</div>';
    }
}

// Init load
window.addEventListener('load', () => {
    if (!document.getElementById("skillModal")) createSkillModal();
    if (!document.getElementById("enhanceModal")) createEnhanceModal();
    initializeExistingSkills();
    initializeLinkedInButtons();
});
