document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let patients = JSON.parse(localStorage.getItem('patients')) || [];
    let tests = JSON.parse(localStorage.getItem('tests')) || [];
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let results = JSON.parse(localStorage.getItem('results')) || [];
    let testDefinitions = JSON.parse(localStorage.getItem('testDefinitions')) || [];
    let consumedLog = JSON.parse(localStorage.getItem('consumedLog')) || [];
    let archive = JSON.parse(localStorage.getItem('archive')) || [];
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let labSettings = JSON.parse(localStorage.getItem('labSettings')) || {
        name: 'اسم المختبر',
        address: 'العنوان هنا',
        phone: 'رقم الهاتف هنا',
        email: 'البريد الإلكتروني هنا',
        logo: 'images/logo.png',
        archiveAfterDays: 30,
    };

    // Initialize default admin if no users exist
    if (users.length === 0) {
        users.push({
            id: 'admin',
            username: 'admin',
            password: 'admin123',
            isDefaultAdmin: true, // To prevent deletion
            permissions: {} // Admin has all permissions implicitly
        });
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Initialize counters for sequential IDs if they don't exist
    labSettings.nextTestId = labSettings.nextTestId || 1;
    labSettings.nextResultId = labSettings.nextResultId || 1;

    // Role-based access control
    let currentUser = null;

    const PERMISSIONS = {
        canViewDashboard: 'عرض لوحة التحكم',
        canViewTodayCases: 'عرض حالات اليوم',
        canViewPatients: 'عرض قائمة المرضى',
        canEditAddDeletePatients: 'إدارة المرضى (إضافة/تعديل/حذف)',
        canManageTests: 'إدارة الفحوصات (إضافة/تعديل/حذف)',
        canWriteResults: 'كتابة النتائج',
        canPrintReports: 'طباعة التقارير',
        canManageTestDefs: 'إدارة أنواع التحاليل',
        canManageInventory: 'إدارة المخزون',
        canViewConsumed: 'عرض المستهلكات',
        canManageSettings: 'إدارة الإعدادات والنسخ الاحتياطي',
        canViewArchive: 'عرض الأرشيف واستعادته',
        canManageUsers: 'إدارة المستخدمين'
    };

    // Chart instances
    let testsStatusChartInstance = null;
    let testsByTypeChartInstance = null;

    let materialListTargetId = null;

    // --- DOM ELEMENTS ---
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    const headerTitle = document.querySelector('header h1');
    const searchInput = document.getElementById('searchInput');
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    const mainContainer = document.querySelector('.container');
    const logoutBtn = document.getElementById('logoutBtn');

    // Forms
    const patientForm = document.getElementById('patientForm');
    const testForm = document.getElementById('testForm');
    const testTypeSearchInput = document.getElementById('testTypeSearch');
    const inventoryForm = document.getElementById('inventoryForm');
    const resultForm = document.getElementById('resultForm');
    const testDefinitionForm = document.getElementById('testDefinitionForm');
    const settingsForm = document.getElementById('settingsForm');
    const archiveDaysInput = document.getElementById('archiveDays');
    const userForm = document.getElementById('userForm');
    const archiveNowBtn = document.getElementById('archiveNowBtn');

    // Tables
    const patientsTableBody = document.querySelector('#patientsTable tbody');
    const testsTableBody = document.querySelector('#testsTable tbody');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const testDefinitionsTableBody = document.querySelector('#testDefinitionsTable tbody');
    const consumedTableBody = document.querySelector('#consumedTable tbody');
    const usersTableBody = document.querySelector('#usersTable tbody');
    const archiveTableBody = document.querySelector('#archiveTable tbody');

    const addTestDefParamBtn = document.getElementById('addTestDefParamBtn');
    const testDefParametersContainer = document.getElementById('testDefParametersContainer');
    const resultParametersContainer = document.getElementById('result-parameters-container');

    const materialsModal = document.getElementById('materialsModal');
    const closeMaterialsModalBtn = document.getElementById('closeMaterialsModalBtn');
    const materialsModalSearch = document.getElementById('materialsModalSearch');
    const materialsModalList = document.getElementById('materialsModalList');
    const confirmMaterialsSelectionBtn = document.getElementById('confirmMaterialsSelectionBtn');
    const openMaterialsModalBtn = document.getElementById('openMaterialsModalBtn');

    // Patient Profile Elements
    const patientProfileSection = document.getElementById('patient-profile');
    const backToPatientsBtn = document.getElementById('backToPatientsBtn');
    const printSelectedTestsBtn = document.getElementById('printSelectedTestsBtn');

    // Dashboard Cards
    const totalPatientsCard = document.getElementById('totalPatients');
    const pendingTestsCard = document.getElementById('pendingTests');
    const totalResultsCard = document.getElementById('totalResults');
    const totalTestDefsCard = document.getElementById('totalTestDefs');
    const lowStockItemsCard = document.getElementById('lowStockItems');

    // Today's Cases Elements
    const printTodayReportBtn = document.getElementById('printTodayReportBtn');
    const todayTotalTestsCard = document.getElementById('todayTotalTests');
    const todayCompletedTestsCard = document.getElementById('todayCompletedTests');
    const todayPendingTestsCard = document.getElementById('todayPendingTests');
    const todayPendingTestsTableBody = document.querySelector('#todayPendingTestsTable tbody');
    const todayCompletedTestsTableBody = document.querySelector('#todayCompletedTestsTable tbody');
    
    // Modal Elements
    const editModal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const editForm = document.getElementById('editForm');
    const closeBtn = document.querySelector('.close-btn');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('passwordInput');

    // Export Buttons
    const exportPatientsBtn = document.getElementById('exportPatientsBtn');
    const exportTestsBtn = document.getElementById('exportTestsBtn');
    const exportInventoryBtn = document.getElementById('exportInventoryBtn');
    const exportConsumedBtn = document.getElementById('exportConsumedBtn');
    const exportResultsBtn = document.getElementById('exportResultsBtn');

    // Backup & Restore Elements
    const backupBtn = document.getElementById('backupBtn');
    const restoreInput = document.getElementById('restoreInput');

    // --- LOGIN & ROLE MANAGEMENT ---
    const checkPermission = (permissionKey) => {
        if (!currentUser || !permissionKey) {
            return false;
        }
        // The default admin has all permissions implicitly
        if (currentUser.isDefaultAdmin) {
            return true;
        }
        return !!currentUser.permissions[permissionKey];
    };

    const applyPermissions = () => {
        // Hide/show nav links
        document.querySelector('a[href="#dashboard"]').style.display = checkPermission('canViewDashboard') ? 'block' : 'none';
        document.querySelector('a[href="#today-cases"]').style.display = checkPermission('canViewTodayCases') ? 'block' : 'none';
        document.querySelector('a[href="#patients"]').style.display = checkPermission('canViewPatients') ? 'block' : 'none';
        document.querySelector('a[href="#tests"]').style.display = checkPermission('canManageTests') ? 'block' : 'none';
        document.querySelector('a[href="#results"]').style.display = checkPermission('canWriteResults') ? 'block' : 'none';
        document.getElementById('inventory-nav').style.display = checkPermission('canManageInventory') ? 'block' : 'none';
        document.querySelector('a[href="#test-definitions"]').style.display = checkPermission('canManageTestDefs') ? 'block' : 'none';
        document.getElementById('consumed-nav').style.display = checkPermission('canViewConsumed') ? 'block' : 'none';
        document.getElementById('settings-nav').style.display = checkPermission('canManageSettings') ? 'block' : 'none';
        document.getElementById('archive-nav').style.display = checkPermission('canViewArchive') ? 'block' : 'none';
        document.getElementById('users-nav').style.display = checkPermission('canManageUsers') ? 'block' : 'none';

        // Hide/show forms and major action buttons
        document.getElementById('patientForm').style.display = checkPermission('canEditAddDeletePatients') ? 'grid' : 'none';
        document.getElementById('printTodayReportBtn').style.display = checkPermission('canPrintReports') ? 'inline-block' : 'none';
        document.getElementById('printSelectedTestsBtn').style.display = checkPermission('canPrintReports') ? 'inline-block' : 'none';
    };

    const completeLogin = (user) => {
        currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        loginModal.style.display = 'none';
        mainContainer.style.visibility = 'visible';

        applyTheme(localStorage.getItem('theme') || 'light');
        applyPermissions();
        updateSidebarHeader();
        renderAll();

        if (checkPermission('canManageSettings')) {
            runArchivingProcess(false); // Run archiving on login, silently
        }

        const lowStockCount = inventory.filter(i => i.currentStock <= i.reorderLevel).length;
        if (lowStockCount > 0) {
            alert(`تنبيه: يوجد ${lowStockCount} مادة في المخزون وصلت إلى حد إعادة الطلب أو أقل.`);
        }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value.trim();
        const password = passwordInput.value;

        const foundUser = users.find(u => u.username === username && u.password === password);

        if (foundUser) {
            completeLogin(foundUser);
        } else {
            alert('اسم المستخدم أو كلمة المرور غير صحيحة.');
            passwordInput.value = '';
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.reload();
    });

    // --- THEME MANAGEMENT ---
    const applyTheme = (theme) => {
        body.classList.toggle('dark-mode', theme === 'dark');
        themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    };
    const toggleTheme = () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };
    themeToggleButton.addEventListener('click', toggleTheme);

    // --- DATA SAVING ---
    const saveData = () => {
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('patients', JSON.stringify(patients));
        localStorage.setItem('tests', JSON.stringify(tests));
        localStorage.setItem('inventory', JSON.stringify(inventory));
        localStorage.setItem('results', JSON.stringify(results));
        localStorage.setItem('testDefinitions', JSON.stringify(testDefinitions));
        localStorage.setItem('consumedLog', JSON.stringify(consumedLog));
        localStorage.setItem('archive', JSON.stringify(archive));
        localStorage.setItem('labSettings', JSON.stringify(labSettings));
    };

    // --- RENDERING FUNCTIONS ---
    const renderPatients = (data = patients) => {
        const canEditDelete = checkPermission('canEditAddDeletePatients');
        patientsTableBody.innerHTML = data.map((p, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${p.nationalId || 'غير مسجل'}</td>
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.gender}</td>
                <td>${p.phone}</td>
                <td>${p.record}</td>
                <td>
                    ${canEditDelete ? `<button class="action-btn edit" data-id="${p.id}" data-type="patient">تعديل</button>` : ''}
                    ${canEditDelete ? `<button class="action-btn delete" data-id="${p.id}" data-type="patient">حذف</button>` : ''}
                </td>
                <td>
                    <button class="action-btn view" data-id="${p.id}" data-type="patient-profile">عرض الملف</button>
                </td>
            </tr>`).join('');
        updatePatientDropdown();
    };

    const renderTests = (data = tests) => {
        const canEditDelete = checkPermission('canManageTests');
        testsTableBody.innerHTML = data.map(t => {
            const patient = patients.find(p => p.id === t.patientId);
            return `
            <tr>
                <td>${t.id}</td>
                <td>${patient ? patient.name : 'مريض محذوف'}</td>
                <td>${t.type}</td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.status}</td>
                <td>
                    ${canEditDelete ? `<button class="action-btn edit" data-id="${t.id}" data-type="test">تعديل</button>` : ''}
                    ${canEditDelete ? `<button class="action-btn delete" data-id="${t.id}" data-type="test">حذف</button>` : ''}
                </td>
            </tr>`;
        }).join('');
        updateResultTestDropdown();
    };
    
    const renderResults = (data = results) => {
        const canEditDelete = checkPermission('canWriteResults');
        const canPrint = checkPermission('canPrintReports');
        resultsTableBody.innerHTML = data.map(r => {
            const test = tests.find(t => t.id === r.testId);
            const patient = test ? patients.find(p => p.id === test.patientId) : null;
            return `
            <tr>
                <td>${r.id}</td>
                <td>${patient ? patient.name : 'مريض محذوف'}</td>
                <td>${test ? test.type : 'فحص محذوف'}</td>
                <td title="${r.notes || ''}">${(r.notes || '').substring(0, 20)}${ (r.notes || '').length > 20 ? '...' : ''}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>
                    ${canEditDelete ? `<button class="action-btn edit" data-id="${r.id}" data-type="result">تعديل</button>` : ''}
                    ${canEditDelete ? `<button class="action-btn delete" data-id="${r.id}" data-type="result">حذف</button>` : ''}
                    ${canPrint ? `<button class="action-btn print" data-id="${r.id}">طباعة</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    };

    const renderInventory = (data = inventory) => {
        const canEditDelete = checkPermission('canManageInventory');
        inventoryTableBody.innerHTML = data.map((i, index) => {
            const totalConsumed = consumedLog
                .filter(log => log.materialId === i.id)
                .reduce((sum, log) => sum + log.quantity, 0);

            return `
            <tr class="${i.currentStock <= i.reorderLevel ? 'low-stock' : ''}">
                <td>${index + 1}</td>
                <td>${i.name}</td>
                <td>${totalConsumed} ${i.unit || ''}</td>
                <td>${i.currentStock} ${i.unit || ''}</td>
                <td>${i.reorderLevel}</td>
                <td>
                    ${canEditDelete ? `<button class="action-btn edit" data-id="${i.id}" data-type="inventory">تعديل</button>` : ''}
                    ${canEditDelete ? `<button class="action-btn delete" data-id="${i.id}" data-type="inventory">حذف</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    };

    const renderTestDefinitions = (data = testDefinitions) => {
        const canEditDelete = checkPermission('canManageTestDefs');
        testDefinitionsTableBody.innerHTML = data.map(def => {
            const parametersHtml = (def.parameters || []).map(p => `<li>${p.name} (${p.refRange} ${p.unit || ''})</li>`).join('');
            const materialsHtml = (def.materials || []).map(m => {
                const item = inventory.find(i => i.id === m.id);
                return `<li>${item ? item.name : 'مادة محذوفة'}: ${m.quantity} ${item ? item.unit : ''}</li>`;
            }).join('');
    
            return `
            <tr>
                <td>${def.name}</td>
                <td><ul class="material-list">${parametersHtml || 'لا يوجد'}</ul></td>
                <td><ul class="material-list">${materialsHtml || 'لا يوجد'}</ul></td>
                <td>
                    ${canEditDelete ? `<button class="action-btn edit" data-id="${def.id}" data-type="test-definition">تعديل</button>` : ''}
                    ${canEditDelete ? `<button class="action-btn delete" data-id="${def.id}" data-type="test-definition">حذف</button>` : ''}
                </td>
            </tr>`;
        }).join('');
        populateTestTypesCheckboxes();
    };

    const renderArchive = (data = archive) => {
        const canRestore = checkPermission('canViewArchive');
        archiveTableBody.innerHTML = data.map(item => `
            <tr>
                <td>${new Date(item.archivedDate).toLocaleDateString('ar-EG')}</td>
                <td>${item.patient.name}</td>
                <td>${item.tests.length}</td>
                <td>
                    <button class="action-btn view" data-id="${item.archiveId}" data-type="archive-view">عرض</button>
                    ${canRestore ? `<button class="action-btn edit" data-id="${item.archiveId}" data-type="archive-restore" style="background-color: #16a085;">استعادة</button>` : ''}
                </td>
            </tr>
        `).join('');
    };

    const renderUsers = (data = users) => {
        if (!checkPermission('canManageUsers')) return;
        usersTableBody.innerHTML = data
            .filter(u => !u.isDefaultAdmin) // Don't show the default admin
            .map(u => {
                const permissionsList = Object.keys(u.permissions)
                    .filter(pKey => u.permissions[pKey])
                    .map(pKey => `<li>${PERMISSIONS[pKey] || pKey}</li>`)
                    .join('');
                
                const notes = u.adminNotes || '';
                const truncatedNotes = notes.substring(0, 30) + (notes.length > 30 ? '...' : '');

                return `
                <tr>
                    <td>${u.username}</td>
                    <td><ul class="material-list">${permissionsList || 'لا يوجد'}</ul></td>
                    <td title="${notes}">${truncatedNotes}</td>
                    <td>
                        <button class="action-btn edit" data-id="${u.id}" data-type="user">تعديل</button>
                        <button class="action-btn delete" data-id="${u.id}" data-type="user">حذف</button>
                    </td>
                </tr>`;
        }).join('');
    };


    const renderConsumedLog = (data = consumedLog) => {
        const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        consumedTableBody.innerHTML = sortedData.map(log => `
            <tr>
                <td>${log.materialName}</td>
                <td>${log.quantity} ${log.unit}</td>
                <td>${log.testType}</td>
                <td>${log.testId}</td>
                <td>${new Date(log.date).toLocaleString('ar-EG')}</td>
            </tr>
        `).join('');
    };

    const isToday = (someDate) => {
        const today = new Date();
        const d = new Date(someDate);
        return d.getDate() == today.getDate() &&
            d.getMonth() == today.getMonth() &&
            d.getFullYear() == today.getFullYear();
    };

    const renderTodayCases = () => {
        const todayTests = tests.filter(t => isToday(t.date));
        const pendingToday = todayTests.filter(t => t.status === 'معلق');
        const completedToday = todayTests.filter(t => t.status === 'مكتمل');

        todayTotalTestsCard.textContent = todayTests.length;
        todayCompletedTestsCard.textContent = completedToday.length;
        todayPendingTestsCard.textContent = pendingToday.length;

        const renderTestRow = (test) => {
            const patient = patients.find(p => p.id === test.patientId);
            return `<tr>
                <td>${patient ? patient.name : 'مريض محذوف'}</td>
                <td>${test.type}</td>
            </tr>`;
        };

        todayPendingTestsTableBody.innerHTML = pendingToday.map(renderTestRow).join('');
        todayCompletedTestsTableBody.innerHTML = completedToday.map(renderTestRow).join('');
    };

    const updateDashboard = () => {
        totalPatientsCard.textContent = patients.length;
        pendingTestsCard.textContent = tests.filter(t => t.status === 'معلق').length;
        totalResultsCard.textContent = results.length;
        totalTestDefsCard.textContent = testDefinitions.length;
        lowStockItemsCard.textContent = inventory.filter(i => i.currentStock <= i.reorderLevel).length;

        updateTestsStatusChart();
        updateTestsByTypeChart();
    };

    const updatePatientDropdown = () => {
        const select = document.getElementById('testPatientId');
        select.innerHTML = '<option value="" disabled selected>اختر مريضاً</option>' +
            patients.map(p => `<option value="${p.id}">${p.id} - ${p.name}</option>`).join('');
    };

    const populateTestTypesCheckboxes = () => {
        const container = document.getElementById('testTypesContainer');
        if (!container) return;
        container.innerHTML = testDefinitions.map(def => `
            <label>
                <input type="checkbox" name="testType" value="${def.name}">
                ${def.name}
            </label>
        `).join('');
    };

    const populateUserPermissions = () => {
        if (!checkPermission('canManageUsers')) return;
        const container = document.getElementById('userPermissionsContainer');
        if (!container) return;
        container.innerHTML = Object.keys(PERMISSIONS).map(key => {
            // Admin can't grant user management permission to others to avoid lockouts
            if (key === 'canManageUsers') return ''; 
            return `
                <label>
                    <input type="checkbox" name="permission" value="${key}" checked>
                    ${PERMISSIONS[key]}
                </label>
            `;
        }).join('');
    };

    testTypeSearchInput.addEventListener('keyup', () => {
        const searchTerm = testTypeSearchInput.value.toLowerCase();
        const testTypeLabels = document.querySelectorAll('#testTypesContainer label');
        
        testTypeLabels.forEach(label => {
            const testName = label.textContent.trim().toLowerCase();
            if (testName.includes(searchTerm)) {
                label.style.display = 'flex';
            } else {
                label.style.display = 'none';
            }
        });
    });

    const updateResultTestDropdown = () => {
        const select = document.getElementById('resultTestId');
        select.innerHTML = '<option value="" disabled selected>اختر فحصًا لإضافة نتيجة</option>' +
            tests.filter(t => t.status === 'معلق').map(t => `<option value="${t.id}">${t.id} - ${t.type}</option>`).join('');
        select.value = '';
    };

    // --- NAVIGATION ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if(item.id === 'logoutBtn') return;
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            const permissionMap = {
                'dashboard': 'canViewDashboard',
                'today-cases': 'canViewTodayCases',
                'patients': 'canViewPatients',
                'tests': 'canManageTests',
                'results': 'canWriteResults',
                'inventory': 'canManageInventory',
                'test-definitions': 'canManageTestDefs',
                'consumed': 'canViewConsumed',
                'settings': 'canManageSettings',
                'archive': 'canViewArchive',
                'users': 'canManageUsers'
            };

            if (permissionMap[targetId] && !checkPermission(permissionMap[targetId])) {
                alert('ليس لديك الصلاحية للوصول إلى هذا القسم.');
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
            patientProfileSection.classList.remove('active');
            resultParametersContainer.innerHTML = '';
            headerTitle.textContent = item.textContent;
            searchInput.value = '';
            
            if (targetId === 'settings') {
                renderSettingsPage();
            }
            if (targetId === 'users') {
                populateUserPermissions();
            }

            renderAll();
        });
    });

    // --- FORM SUBMISSIONS ---
    patientForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!checkPermission('canEditAddDeletePatients')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        const nationalId = document.getElementById('patientNationalId').value;
        if (nationalId && patients.some(p => p.nationalId === nationalId)) {
            alert('الرقم الوطني مسجل بالفعل لمريض آخر.');
            return;
        }

        patients.push({
            id: `P${Date.now()}`,
            nationalId: nationalId,
            name: document.getElementById('patientName').value,
            age: document.getElementById('patientAge').value,
            gender: document.getElementById('patientGender').value,
            phone: document.getElementById('patientPhone').value,
            record: document.getElementById('patientRecord').value,
        });
        saveData();
        renderPatients();
        updateDashboard();
        patientForm.reset();
    });

    testForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!checkPermission('canManageTests')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        const patientId = document.getElementById('testPatientId').value;
        const selectedTests = document.querySelectorAll('#testTypesContainer input[name="testType"]:checked');

        if (!patientId) {
            alert('الرجاء اختيار مريض أولاً.');
            return;
        }

        if (selectedTests.length === 0) {
            alert('الرجاء اختيار فحص واحد على الأقل.');
            return;
        }

        const newTests = [];
        selectedTests.forEach(checkbox => {
            newTests.push({
                id: labSettings.nextTestId++,
                patientId: patientId,
                type: checkbox.value,
                status: 'معلق',
                date: new Date(),
            });
        });

        tests.push(...newTests);
        saveData();
        renderAll();
        testForm.reset();
        alert(`تمت إضافة ${newTests.length} فحص/فحوصات بنجاح.`);
    });
    
    inventoryForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!checkPermission('canManageInventory')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        inventory.push({
            id: `I${Date.now()}`,
            name: document.getElementById('itemName').value,
            unit: document.getElementById('itemUnit').value,
            currentStock: parseInt(document.getElementById('currentStock').value),
            reorderLevel: parseInt(document.getElementById('reorderLevel').value),
        });
        saveData();
        renderInventory();
        updateDashboard();
        inventoryForm.reset();
    });

    testDefinitionForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!checkPermission('canManageTestDefs')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        const materials = [];
        document.querySelectorAll('#testDefMaterialsList .consumed-material-item').forEach(matItem => {
            materials.push({
                id: matItem.dataset.id,
                quantity: parseInt(matItem.dataset.quantity)
            });
        });
    
        const parameters = [];
        document.querySelectorAll('#testDefParametersContainer .parameter-entry-row').forEach(paramRow => {
            parameters.push({
                name: paramRow.querySelector('.param-name').value,
                refRange: paramRow.querySelector('.param-ref').value,
                unit: paramRow.querySelector('.param-unit').value,
            });
        });

        if (parameters.length === 0) {
            alert('يجب إضافة تحليل فرعي واحد على الأقل.');
            return;
        }

        const newDefName = document.getElementById('testDefName').value.trim();
        if (!newDefName) {
            alert('اسم الفحص لا يمكن أن يكون فارغاً.');
            return;
        }

        if (testDefinitions.some(def => def.name.trim().toLowerCase() === newDefName.toLowerCase())) {
            alert('يوجد نوع تحليل آخر بنفس الاسم. الرجاء اختيار اسم فريد.');
            return;
        }

        testDefinitions.push({
            id: `TD${Date.now()}`,
            name: newDefName,
            parameters: parameters,
            materials: materials
        });
    
        saveData();
        renderTestDefinitions();
        updateDashboard();
        testDefinitionForm.reset();
        document.getElementById('testDefMaterialsList').innerHTML = '';
        document.getElementById('testDefParametersContainer').innerHTML = '';
    });

    userForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!checkPermission('canManageUsers')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('userPassword').value;
        const adminNotes = document.getElementById('userAdminNotes').value;

        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            alert('اسم المستخدم هذا موجود بالفعل.');
            return;
        }
        if (password.length < 4) {
            alert('يجب أن تكون كلمة المرور 4 أحرف على الأقل.');
            return;
        }

        const permissions = {};
        document.querySelectorAll('#userPermissionsContainer input:checked').forEach(cb => {
            permissions[cb.value] = true;
        });

        users.push({
            id: `U${Date.now()}`,
            username,
            password, // NOTE: In a real app, hash this password!
            permissions,
            adminNotes: adminNotes
        });

        saveData();
        renderUsers();
        userForm.reset();
        alert('تم إنشاء المستخدم بنجاح.');
    });

    resultForm.addEventListener('submit', e => {
        e.preventDefault();
        const testId = parseInt(document.getElementById('resultTestId').value);
        const test = tests.find(t => t.id === testId);
        if (!test) return;
        const testDef = testDefinitions.find(def => def.name === test.type);

        if (!checkPermission('canWriteResults')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }

        if (!testDef) {
            alert('خطأ: تعريف هذا التحليل غير موجود. لا يمكن تحديد المواد المستهلكة.');
            return;
        }

        let allMaterialsAvailable = true;
        (testDef.materials || []).forEach(material => {
            const inventoryItem = inventory.find(i => i.id === material.id);
            if (!inventoryItem || inventoryItem.currentStock < material.quantity) {
                alert(`كمية غير كافية في المخزون للمادة: ${inventoryItem ? inventoryItem.name : 'مادة محذوفة'}`);
                allMaterialsAvailable = false;
            }
        });

        if (!allMaterialsAvailable) return;

        (testDef.materials || []).forEach(material => {
            const inventoryItem = inventory.find(i => i.id === material.id);
            consumedLog.push({
                materialId: material.id,
                materialName: inventoryItem.name,
                quantity: material.quantity,
                unit: inventoryItem.unit || '',
                testId: test.id,
                testType: test.type,
                date: new Date()
            });
            inventoryItem.currentStock -= material.quantity;
        });

        const parameterResults = [];
        document.querySelectorAll('#result-parameters-container .parameter-entry-row').forEach(paramRow => {
            parameterResults.push({
                name: paramRow.dataset.name,
                refRange: paramRow.dataset.ref,
                unit: paramRow.dataset.unit,
                value: paramRow.querySelector('input[type="text"]').value,
            });
        });

        results.push({
            id: labSettings.nextResultId++,
            testId: testId,
            parameterResults: parameterResults,
            notes: document.getElementById('resultNotes').value,
            date: new Date(),
        });

        test.status = 'مكتمل';

        saveData();
        renderAll();
        resultForm.reset();
        resultParametersContainer.innerHTML = '';
        alert('تم تسجيل النتيجة بنجاح، وأصبح الفحص مكتملاً.');
    });

    // --- AUTO-POPULATE RESULT FORM ---
    document.getElementById('resultTestId').addEventListener('change', e => {
        const testId = parseInt(e.target.value);
        const test = tests.find(t => t.id === testId);
        resultParametersContainer.innerHTML = '';
        if (!test) return;

        const testDef = testDefinitions.find(def => def.name === test.type);
        if (!testDef) {
            alert('تعريف هذا التحليل غير موجود! لا يمكن إدخال النتائج.');
            return;
        }

        (testDef.parameters || []).forEach(param => {
            const row = document.createElement('div');
            row.className = 'parameter-entry-row';
            row.dataset.name = param.name;
            row.dataset.ref = param.refRange;
            row.dataset.unit = param.unit || '';
            row.innerHTML = `
                <label>${param.name}</label>
                <input type="text" placeholder="أدخل النتيجة" required>
                <span>${param.unit || ''}</span>
                <span>${param.refRange}</span>
            `;
            resultParametersContainer.appendChild(row);
        });
    });

    // Test Definition Parameters
    addTestDefParamBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'parameter-entry-row';
        row.innerHTML = `
            <input type="text" class="param-name" placeholder="اسم التحليل الفرعي" required>
            <input type="text" class="param-ref" placeholder="النطاق المرجعي" required>
            <input type="text" class="param-unit" placeholder="الوحدة">
            <button type="button" class="remove-param-btn">X</button>
        `;
        testDefParametersContainer.appendChild(row);
    });

    testDefParametersContainer.addEventListener('click', e => {
        if (e.target.classList.contains('remove-param-btn')) {
            e.target.closest('.parameter-entry-row').remove();
        }
    });

    // --- MATERIALS MODAL LOGIC ---
    const openMaterialsModal = () => {
        const targetList = document.getElementById(materialListTargetId);
        if (!targetList) return;
    
        const currentlySelected = {};
        targetList.querySelectorAll('.consumed-material-item').forEach(item => {
            currentlySelected[item.dataset.id] = parseInt(item.dataset.quantity);
        });
    
        materialsModalList.innerHTML = '';
        inventory.forEach(item => {
            const quantity = currentlySelected[item.id] || 0;
            const isChecked = quantity > 0;
    
            const modalItem = document.createElement('div');
            modalItem.className = 'material-modal-item';
            modalItem.dataset.name = item.name.toLowerCase();
            modalItem.innerHTML = `
                <input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <label>${item.name} (${item.unit || 'وحدة'})</label>
                <input type="number" min="0" value="${quantity}" class="modal-quantity-input">
            `;
            materialsModalList.appendChild(modalItem);
        });
        
        materialsModalSearch.value = '';
        materialsModal.style.display = 'flex';
    };
    
    const closeMaterialsModal = () => {
        materialsModal.style.display = 'none';
    };
    
    openMaterialsModalBtn.addEventListener('click', () => {
        materialListTargetId = 'testDefMaterialsList';
        openMaterialsModal();
    });
    
    closeMaterialsModalBtn.addEventListener('click', closeMaterialsModal);
    
    materialsModalSearch.addEventListener('keyup', e => {
        const searchTerm = e.target.value.toLowerCase();
        materialsModalList.querySelectorAll('.material-modal-item').forEach(item => {
            const name = item.dataset.name;
            item.style.display = name.includes(searchTerm) ? 'grid' : 'none';
        });
    });
    
    confirmMaterialsSelectionBtn.addEventListener('click', () => {
        const targetList = document.getElementById(materialListTargetId);
        if (!targetList) return;
    
        targetList.innerHTML = '';
    
        materialsModalList.querySelectorAll('.material-modal-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const quantityInput = item.querySelector('input[type="number"]');
            
            if (checkbox.checked && quantityInput.value > 0) {
                const materialId = checkbox.dataset.id;
                const quantity = parseInt(quantityInput.value);
                const material = inventory.find(i => i.id === materialId);
    
                if (material) {
                    const displayItem = document.createElement('div');
                    displayItem.className = 'consumed-material-item';
                    displayItem.dataset.id = materialId;
                    displayItem.dataset.quantity = quantity;
                    displayItem.innerHTML = `
                        <span>${material.name}</span>
                        <span>الكمية: ${quantity} ${material.unit || ''}</span>
                    `;
                    targetList.appendChild(displayItem);
                }
            }
        });
    
        closeMaterialsModal();
    });

    // --- SETTINGS PAGE ---
    const renderSettingsPage = () => {
        document.getElementById('labName').value = labSettings.name;
        document.getElementById('labAddress').value = labSettings.address;
        document.getElementById('labPhone').value = labSettings.phone;
        document.getElementById('labEmail').value = labSettings.email;
        archiveDaysInput.value = labSettings.archiveAfterDays || 30;
        const logoPreview = document.getElementById('logoPreview');
        if (labSettings.logo && labSettings.logo.startsWith('data:image')) {
            logoPreview.src = labSettings.logo;
            logoPreview.style.display = 'block';
        }
    };

    document.getElementById('labLogoInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('logoPreview').src = event.target.result;
                document.getElementById('logoPreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!checkPermission('canManageSettings')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        labSettings.name = document.getElementById('labName').value;
        labSettings.address = document.getElementById('labAddress').value;
        labSettings.phone = document.getElementById('labPhone').value;
        labSettings.email = document.getElementById('labEmail').value;
        labSettings.logo = document.getElementById('logoPreview').src;
        labSettings.archiveAfterDays = parseInt(archiveDaysInput.value) || 30;
        saveData();
        updateSidebarHeader();
        alert('تم حفظ الإعدادات بنجاح!');
    });

    // --- ARCHIVING ---
    archiveNowBtn.addEventListener('click', () => {
        if (!checkPermission('canManageSettings')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        if (confirm('هل أنت متأكد من رغبتك في أرشفة السجلات القديمة الآن؟')) {
            runArchivingProcess(true);
        }
    });

    const runArchivingProcess = (showFeedback = false) => {        
        const archiveDays = labSettings.archiveAfterDays || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - archiveDays);

        let archivedCount = 0;
        
        const patientIdsToArchive = patients.filter(patient => {
            const patientTests = tests.filter(t => t.patientId === patient.id);
            if (patientTests.length === 0) return false;

            const allTestsCompleted = patientTests.every(t => t.status === 'مكتمل');
            if (!allTestsCompleted) return false;

            const resultDates = patientTests.map(t => {
                const result = results.find(r => r.testId === t.id);
                return result ? new Date(result.date) : null;
            }).filter(Boolean);

            if (resultDates.length !== patientTests.length) return false;

            const mostRecentDate = new Date(Math.max.apply(null, resultDates));
            return mostRecentDate < cutoffDate;
        }).map(p => p.id);


        if (patientIdsToArchive.length > 0) {
            patientIdsToArchive.forEach(patientId => {
                const patient = patients.find(p => p.id === patientId);
                const patientTests = tests.filter(t => t.patientId === patientId);
                const patientTestIds = patientTests.map(t => t.id);
                const patientResults = results.filter(r => patientTestIds.includes(r.testId));

                archive.push({
                    archiveId: `A${Date.now()}_${patient.id}`,
                    archivedDate: new Date(),
                    patient: patient,
                    tests: patientTests,
                    results: patientResults
                });
                archivedCount++;
            });

            patients = patients.filter(p => !patientIdsToArchive.includes(p.id));
            tests = tests.filter(t => !patientIdsToArchive.includes(t.patientId));
            results = results.filter(r => !tests.find(t => t.id === r.testId && patientIdsToArchive.includes(t.patientId)));
            
            saveData();
            renderAll();
        }

        if (showFeedback) {
            if (archivedCount > 0) {
                alert(`تمت أرشفة سجلات ${archivedCount} مرضى بنجاح.`);
            } else {
                alert('لا توجد سجلات قديمة تستوفي شروط الأرشفة حاليًا.');
            }
        }
    };

    // --- BACKUP & RESTORE ---
    backupBtn.addEventListener('click', () => {
        if (!checkPermission('canManageSettings')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        if (!confirm('هل تريد إنشاء نسخة احتياطية من جميع بيانات النظام؟')) {
            return;
        }

        const backupData = {
            patients,
            tests,
            inventory,
            results,
            testDefinitions,
            consumedLog,
            archive,
            labSettings
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        link.download = `lab_backup_${today}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        alert('تم إنشاء ملف النسخة الاحتياطية بنجاح.');
    });

    restoreInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!checkPermission('canManageSettings')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }

        if (!confirm('تحذير! هل أنت متأكد من رغبتك في استعادة البيانات من هذا الملف؟ سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في الملف.')) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const restoredData = JSON.parse(event.target.result);

                const requiredKeys = ['patients', 'tests', 'inventory', 'results', 'testDefinitions', 'consumedLog', 'archive', 'labSettings'];
                if (!requiredKeys.every(key => restoredData.hasOwnProperty(key))) {
                    alert('خطأ: ملف النسخة الاحتياطية غير صالح أو تالف.');
                    e.target.value = '';
                    return;
                }

                localStorage.setItem('patients', JSON.stringify(restoredData.patients || []));
                localStorage.setItem('tests', JSON.stringify(restoredData.tests || []));
                localStorage.setItem('inventory', JSON.stringify(restoredData.inventory || []));
                localStorage.setItem('results', JSON.stringify(restoredData.results || []));
                localStorage.setItem('testDefinitions', JSON.stringify(restoredData.testDefinitions || []));
                localStorage.setItem('consumedLog', JSON.stringify(restoredData.consumedLog || []));
                localStorage.setItem('archive', JSON.stringify(restoredData.archive || []));
                localStorage.setItem('labSettings', JSON.stringify(restoredData.labSettings || {}));

                alert('تم استعادة البيانات بنجاح. سيتم إعادة تحميل التطبيق الآن.');
                window.location.reload();

            } catch (error) {
                alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية. تأكد من أن الملف صحيح.');
                console.error("Restore error:", error);
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    });

    // --- ACTIONS (EDIT/DELETE/PRINT) ---
    document.body.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('delete')) {
            handleDelete(target.dataset.id, target.dataset.type);
        }
        if (target.classList.contains('edit')) {
            handleEdit(target.dataset.id, target.dataset.type);
        }
        if (target.classList.contains('view') && target.dataset.type === 'patient-profile') {
            handleViewProfile(target.dataset.id);
        }
        if (target.classList.contains('print')) {
            handlePrint(target.dataset.id);
        }
        if (target.dataset.type === 'archive-restore') {
            handleRestoreFromArchive(target.dataset.id);
        }
        if (target.dataset.type === 'archive-view') {
            handleViewArchivedProfile(target.dataset.id);
        }
    });

    printSelectedTestsBtn.addEventListener('click', () => {
        const selectedResultIds = Array.from(document.querySelectorAll('.test-print-checkbox:checked')).map(cb => parseInt(cb.value));
        
        if (selectedResultIds.length === 0) {
            alert('الرجاء تحديد تحليل واحد على الأقل للطباعة.');
            return;
        }
    
        handleMultiPrint(selectedResultIds);
    });

    printTodayReportBtn.addEventListener('click', () => handlePrintTodayReport());

    const handleDelete = (id, type) => {
        const permissionMap = {
            'patient': 'canEditAddDeletePatients',
            'test': 'canManageTests',
            'result': 'canWriteResults',
            'inventory': 'canManageInventory',
            'test-definition': 'canManageTestDefs',
            'user': 'canManageUsers'
        };
        if (!checkPermission(permissionMap[type])) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        if (!confirm(`هل أنت متأكد من رغبتك في حذف هذا الـ ${type}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

        switch (type) {
            case 'patient':
                const testsToDelete = tests.filter(t => t.patientId === id).map(t => t.id);
                results = results.filter(r => !testsToDelete.includes(r.testId));
                tests = tests.filter(t => t.patientId !== id);
                patients = patients.filter(p => p.id !== id);
                break;
            case 'test':
                results = results.filter(r => r.testId !== parseInt(id));
                tests = tests.filter(t => t.id !== parseInt(id));
                break;
            case 'result':
                results = results.filter(r => r.id !== parseInt(id));
                break;
            case 'inventory':
                inventory = inventory.filter(i => i.id !== id);
                break;
            case 'test-definition':
                const def = testDefinitions.find(d => d.id === id);
                if (def && (tests.some(t => t.type === def.name) || archive.some(a => a.tests.some(t => t.type === def.name)))) {
                    alert('لا يمكن حذف هذا النوع من التحاليل لأنه مستخدم في فحوصات حالية أو مؤرشفة.');
                    return;
                }
                testDefinitions = testDefinitions.filter(d => d.id !== id);
                break;
            case 'user':
                const userToDelete = users.find(u => u.id === id);
                if (userToDelete && userToDelete.isDefaultAdmin) {
                    alert('لا يمكن حذف حساب المدير الافتراضي.');
                    return;
                }
                users = users.filter(u => u.id !== id);
                break;
        }
        saveData();
        renderAll();
    };

    const handleViewProfile = (patientId) => {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;

        sections.forEach(sec => sec.classList.remove('active'));
        patientProfileSection.classList.add('active');
        
        headerTitle.textContent = `ملف المريض: ${patient.name}`;

        renderPatientProfile(patient);
    };

    const renderPatientProfile = (patient) => {
        const canPrint = checkPermission('canPrintReports');
        const infoDiv = document.getElementById('patient-profile-info');
        infoDiv.innerHTML = `
            <p><strong>المعرف:</strong> ${patient.id}</p>
            <p><strong>الرقم الوطني:</strong> ${patient.nationalId || 'غير مسجل'}</p>
            <p><strong>الاسم:</strong> ${patient.name}</p>
            <p><strong>العمر:</strong> ${patient.age}</p>
            <p><strong>الجنس:</strong> ${patient.gender}</p>
            <p><strong>الهاتف:</strong> ${patient.phone || 'لا يوجد'}</p>
            <p><strong>السجل الطبي:</strong> ${patient.record || 'لا يوجد'}</p>
        `;

        const testsTableBody = document.querySelector('#patientProfileTestsTable tbody');
        const patientTests = tests.filter(t => t.patientId === patient.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        testsTableBody.innerHTML = patientTests.map((test, index) => {
            const result = results.find(r => r.testId === test.id);
            const printButton = result 
                ? (canPrint ? `<button class="action-btn print" data-id="${result.id}">طباعة</button>` : '')
                : `<button class="action-btn" disabled>معلق</button>`;
            const checkbox = result
                ? (canPrint ? `<input type="checkbox" class="test-print-checkbox" value="${result.id}">` : '')
                : `<input type="checkbox" disabled>`;

            return `<tr>
                <td>${checkbox}</td>
                <td>${index + 1}</td>
                <td>${test.type}</td>
                <td>${new Date(test.date).toLocaleDateString('ar-EG')}</td>
                <td>${test.status}</td>
                <td>${printButton}</td>
            </tr>`;
        }).join('');
    };

    const handleRestoreFromArchive = (archiveId) => {
        if (!checkPermission('canViewArchive')) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        if (!confirm('هل أنت متأكد من رغبتك في استعادة هذا السجل من الأرشيف؟')) return;

        const archiveIndex = archive.findIndex(item => item.archiveId === archiveId);
        if (archiveIndex === -1) {
            alert('لم يتم العثور على السجل في الأرشيف.');
            return;
        }

        const itemToRestore = archive[archiveIndex];

        patients.push(itemToRestore.patient);
        tests.push(...itemToRestore.tests);
        results.push(...itemToRestore.results);

        archive.splice(archiveIndex, 1);

        saveData();
        renderAll();
        alert(`تم استعادة سجل المريض "${itemToRestore.patient.name}" بنجاح.`);
    };

    const handleViewArchivedProfile = (archiveId) => {
        const archivedItem = archive.find(item => item.archiveId === archiveId);
        if (!archivedItem) return;

        sections.forEach(sec => sec.classList.remove('active'));
        patientProfileSection.classList.add('active');
        
        headerTitle.textContent = `ملف المريض (مؤرشف): ${archivedItem.patient.name}`;

        const infoDiv = document.getElementById('patient-profile-info');
        infoDiv.innerHTML = `
            <p><strong>المعرف:</strong> ${archivedItem.patient.id}</p>
            <p><strong>الرقم الوطني:</strong> ${archivedItem.patient.nationalId || 'غير مسجل'}</p>
            <p><strong>الاسم:</strong> ${archivedItem.patient.name}</p>
            <p><strong>العمر:</strong> ${archivedItem.patient.age}</p>
            <p><strong>الجنس:</strong> ${archivedItem.patient.gender}</p>
            <p><strong>الهاتف:</strong> ${archivedItem.patient.phone || 'لا يوجد'}</p>
            <p><strong>السجل الطبي:</strong> ${archivedItem.patient.record || 'لا يوجد'}</p>
        `;

        const testsTableBody = document.querySelector('#patientProfileTestsTable tbody');
        const patientTests = archivedItem.tests.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        testsTableBody.innerHTML = patientTests.map((test, index) => {
            const result = archivedItem.results.find(r => r.testId === test.id);
            const printButton = result 
                ? `<button class="action-btn print" data-id="${result.id}" disabled>طباعة (مؤرشف)</button>` 
                : `<button class="action-btn" disabled>معلق</button>`;
            const checkbox = `<input type="checkbox" disabled>`;

            return `<tr>
                <td>${checkbox}</td>
                <td>${index + 1}</td>
                <td>${test.type}</td>
                <td>${new Date(test.date).toLocaleDateString('ar-EG')}</td>
                <td>${test.status}</td>
                <td>${printButton}</td>
            </tr>`;
        }).join('');

        backToPatientsBtn.onclick = () => {
            document.querySelector('a[href="#archive"]').click();
            backToPatientsBtn.onclick = defaultBackToPatients;
        };
    };

    const handlePrintTodayReport = () => {
        const todayTests = tests.filter(t => isToday(t.date));
        const pendingToday = todayTests.filter(t => t.status === 'معلق');
        const completedToday = todayTests.filter(t => t.status === 'مكتمل');
    
        const todayDate = new Date().toLocaleDateString('ar-EG');
    
        const summaryHtml = `
            <table class="report-patient-info">
                <tr>
                    <th>إجمالي فحوصات اليوم</th><td>${todayTests.length}</td>
                    <th>الفحوصات المكتملة</th><td>${completedToday.length}</td>
                    <th>الفحوصات المعلقة</th><td>${pendingToday.length}</td>
                </tr>
            </table>
        `;
    
        const createTestListHtml = (title, testList) => {
            if (testList.length === 0) {
                return `<h3>${title} (0)</h3><p>لا يوجد.</p>`;
            }
            return `
                <h3>${title} (${testList.length})</h3>
                <table class="report-results-table">
                    <thead><tr><th>اسم المريض</th><th>نوع الفحص</th></tr></thead>
                    <tbody>
                        ${testList.map(t => {
                            const patient = patients.find(p => p.id === t.patientId);
                            return `<tr><td>${patient ? patient.name : 'مريض محذوف'}</td><td>${t.type}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `;
        };
    
        const pendingHtml = createTestListHtml('الفحوصات المعلقة (المتبقية)', pendingToday);
        const completedHtml = createTestListHtml('الفحوصات المكتملة (المنتهية)', completedToday);
    
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="report-header">
                <div class="report-header-logo">
                    <img src="${labSettings.logo}" alt="شعار المختبر">
                </div>
                <div class="report-header-info">
                    <h2>${labSettings.name}</h2>
                    <p>${labSettings.address}</p>
                    <p>هاتف: ${labSettings.phone} | بريد إلكتروني: ${labSettings.email}</p>
                </div>
            </div>
            <h2 class="report-title">تقرير حالات اليوم (${todayDate})</h2>
            ${summaryHtml}
            <div class="report-results-section" style="margin-top: 20px;">
                ${pendingHtml}
            </div>
            <div class="report-results-section" style="margin-top: 20px;">
                ${completedHtml}
            </div>
            <div class="report-footer">
                <p>تاريخ إصدار التقرير: ${new Date().toLocaleString('ar-EG')}</p>
            </div>
        `;
        window.print();
    };

    const handlePrint = (resultId) => {
        const allResults = [...results, ...archive.flatMap(a => a.results)];
        const allTests = [...tests, ...archive.flatMap(a => a.tests)];
        const allPatients = [...patients, ...archive.map(a => a.patient)];

        const initialResult = allResults.find(r => r.id === parseInt(resultId));
        if (!initialResult) { alert('لم يتم العثور على النتيجة!'); return; }
        const initialTest = allTests.find(t => t.id === initialResult.testId);
        if (!initialTest) { alert('لم يتم العثور على الفحص المرتبط!'); return; }
        const patient = allPatients.find(p => p.id === initialTest.patientId);
        if (!patient) { alert('لم يتم العثور على المريض المرتبط!'); return; }
    
        const visitDate = new Date(initialTest.date).toLocaleDateString('ar-EG');
    
        const testsForVisit = allTests.filter(t => 
            t.patientId === patient.id && 
            new Date(t.date).toLocaleDateString('ar-EG') === visitDate
        );
    
        const resultsForVisit = testsForVisit.map(test => {
            const result = allResults.find(r => r.testId === test.id);
            return result ? { test, result } : null;
        }).filter(Boolean);
    
        if (resultsForVisit.length === 0) {
            alert('لا توجد نتائج مكتملة لهذا المريض في هذا التاريخ.');
            return;
        }
    
        const resultsHtml = resultsForVisit.map(({ test, result }) => {
            const notesHtml = result.notes ? `
                <div class="report-notes-section">
                    <p><strong>ملاحظات الطبيب:</strong></p>
                    <p>${result.notes.replace(/\n/g, '<br>')}</p>
                </div>
            ` : '';

            const parametersTable = `
                <table class="report-results-table">
                    <thead>
                        <tr>
                            <th>التحليل</th>
                            <th>النتيجة</th>
                            <th>الوحدة</th>
                            <th>النطاق المرجعي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.parameterResults || []).map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.value}</td>
                                <td>${p.unit}</td>
                                <td>${p.refRange}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            return `
            <div class="report-results-section">
                <h3>${test.type}</h3>
                ${parametersTable}
                ${notesHtml}
            </div>
        `;
        }).join('');
    
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="report-header">
                <div class="report-header-logo">
                    <img src="${labSettings.logo}" alt="شعار المختبر">
                </div>
                <div class="report-header-info">
                    <h2>${labSettings.name}</h2>
                    <p>${labSettings.address}</p>
                    <p>هاتف: ${labSettings.phone} | بريد إلكتروني: ${labSettings.email}</p>
                </div>
            </div>
            <h2 class="report-title">تقرير نتيجة المختبر</h2>
            <div class="report-patient-info">
                <table>
                    <tr><th>اسم المريض:</th><td>${patient.name}</td><th>العمر:</th><td>${patient.age}</td></tr>
                    <tr><th>الجنس:</th><td>${patient.gender}</td><th>تاريخ الزيارة:</th><td>${visitDate}</td></tr>
                    <tr><th>معرف المريض:</th><td>${patient.id}</td><th></th><td></td></tr>
                </table>
            </div>
            ${resultsHtml}
            <div class="report-footer">
                <p>تاريخ إصدار التقرير: ${new Date().toLocaleString('ar-EG')}</p>
                <p>مع تمنياتنا لكم بالشفاء العاجل</p>
            </div>
            <div class="report-signatures">
                <div class="signature-box">
                    <div class="line"></div>
                    <p>توقيع فني المختبر</p>
                </div>
                <div class="signature-box">
                    <div class="line"></div>
                    <p>توقيع الطبيب المشرف</p>
                </div>
            </div>
        `;
        window.print();
    };

    const handleMultiPrint = (resultIds) => {
        const allResults = [...results, ...archive.flatMap(a => a.results)];
        const allTests = [...tests, ...archive.flatMap(a => a.tests)];
        const allPatients = [...patients, ...archive.map(a => a.patient)];

        const firstResult = allResults.find(r => r.id === resultIds[0]);
        if (!firstResult) { alert('خطأ في العثور على النتائج المحددة.'); return; }
        const firstTest = allTests.find(t => t.id === firstResult.testId);
        if (!firstTest) { alert('خطأ في العثور على الفحوصات المرتبطة.'); return; }
        const patient = allPatients.find(p => p.id === firstTest.patientId);
        if (!patient) { alert('لم يتم العثور على المريض المرتبط!'); return; }
    
        const resultsToPrint = resultIds.map(id => {
            const result = allResults.find(r => r.id === id);
            const test = result ? allTests.find(t => t.id === result.testId) : null;
            return result && test ? { test, result } : null;
        }).filter(Boolean);
    
        if (resultsToPrint.length === 0) {
            alert('لا توجد نتائج صالحة للطباعة.');
            return;
        }
    
        const resultsHtml = resultsToPrint.map(({ test, result }) => {
            const notesHtml = result.notes ? `
                <div class="report-notes-section">
                    <p><strong>ملاحظات الطبيب (بتاريخ ${new Date(test.date).toLocaleDateString('ar-EG')}):</strong></p>
                    <p>${result.notes.replace(/\n/g, '<br>')}</p>
                </div>
            ` : '';
    
            const parametersTable = `
                <table class="report-results-table">
                    <thead>
                        <tr>
                            <th>التحليل</th>
                            <th>النتيجة</th>
                            <th>الوحدة</th>
                            <th>النطاق المرجعي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.parameterResults || []).map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.value}</td>
                                <td>${p.unit}</td>
                                <td>${p.refRange}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
    
            return `
            <div class="report-results-section">
                <h3>${test.type} (بتاريخ ${new Date(test.date).toLocaleDateString('ar-EG')})</h3>
                ${parametersTable}
                ${notesHtml}
            </div>
            `;
        }).join('');
    
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="report-header">
                <div class="report-header-logo">
                    <img src="${labSettings.logo}" alt="شعار المختبر">
                </div>
                <div class="report-header-info">
                    <h2>${labSettings.name}</h2>
                    <p>${labSettings.address}</p>
                    <p>هاتف: ${labSettings.phone} | بريد إلكتروني: ${labSettings.email}</p>
                </div>
            </div>
            <h2 class="report-title">تقرير نتائج مجمعة</h2>
            <div class="report-patient-info">
                <table>
                    <tr><th>اسم المريض:</th><td>${patient.name}</td><th>العمر:</th><td>${patient.age}</td></tr>
                    <tr><th>الجنس:</th><td>${patient.gender}</td><th>معرف المريض:</th><td>${patient.id}</td></tr>
                </table>
            </div>
            ${resultsHtml}
            <div class="report-footer">
                <p>تاريخ إصدار التقرير: ${new Date().toLocaleString('ar-EG')}</p>
                <p>مع تمنياتنا لكم بالشفاء العاجل</p>
            </div>
        `;
        window.print();
    };

    const handleEdit = (id, type) => {
        const permissionMap = {
            'patient': 'canEditAddDeletePatients',
            'test': 'canManageTests',
            'result': 'canWriteResults',
            'inventory': 'canManageInventory',
            'test-definition': 'canManageTestDefs',
            'user': 'canManageUsers'
        };
        if (!checkPermission(permissionMap[type])) {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }

        const data = { patient: patients, test: tests, result: results, inventory: inventory, 'test-definition': testDefinitions, user: users };
        const numericIdTypes = ['test', 'result'];
        const searchId = numericIdTypes.includes(type) ? parseInt(id) : id;
        const item = data[type].find(i => i.id === searchId);
        let formHtml = '';
        modalTitle.textContent = `تعديل ${type}`;

        switch (type) {
            case 'patient':
                formHtml = `
                    <input type="text" id="editPatientNationalId" value="${item.nationalId || ''}" placeholder="الرقم الوطني" required>
                    <input type="text" id="editPatientName" value="${item.name}" placeholder="اسم المريض" required>
                    <input type="number" id="editPatientAge" value="${item.age}" placeholder="العمر" required>
                    <select id="editPatientGender" required>
                        <option value="ذكر" ${item.gender === 'ذكر' ? 'selected' : ''}>ذكر</option>
                        <option value="أنثى" ${item.gender === 'أنثى' ? 'selected' : ''}>أنثى</option>
                    </select>
                    <input type="tel" id="editPatientPhone" value="${item.phone}" placeholder="رقم الهاتف">
                    <textarea id="editPatientRecord" placeholder="السجل الطبي">${item.record}</textarea>`;
                break;
            case 'test':
                const testTypeOptions = testDefinitions.map(def => `<option value="${def.name}" ${item.type === def.name ? 'selected' : ''}>${def.name}</option>`).join('');
                formHtml = `
                    <select id="editTestType" required>${testTypeOptions}</select>
                    <select id="editTestStatus" required>
                        <option value="معلق" ${item.status === 'معلق' ? 'selected' : ''}>معلق</option>
                        <option value="مكتمل" ${item.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                    </select>`;
                break;
            case 'inventory':
                 formHtml = `
                    <input type="text" id="editItemName" value="${item.name}" placeholder="اسم المادة" required>
                    <input type="text" id="editItemUnit" value="${item.unit || ''}" placeholder="وحدة القياس" required>
                    <input type="number" id="editCurrentStock" value="${item.currentStock}" placeholder="الكمية الحالية" required>
                    <input type="number" id="editReorderLevel" value="${item.reorderLevel}" placeholder="حد إعادة الطلب" required>`;
                break;
            case 'result':
                const resTest = tests.find(t => t.id === item.testId);
                const resTestDef = resTest ? testDefinitions.find(d => d.name === resTest.type) : null;
                if (!resTestDef) {
                    alert('لا يمكن تعديل هذه النتيجة، تعريف الفحص المرتبط بها محذوف.');
                    return;
                }
                const paramResultsHtml = (resTestDef.parameters || []).map(p => {
                    const savedResult = (item.parameterResults || []).find(pr => pr.name === p.name);
                    return `
                    <div class="parameter-entry-row" data-name="${p.name}" data-ref="${p.refRange}" data-unit="${p.unit || ''}">
                        <label>${p.name}</label>
                        <input type="text" value="${savedResult ? savedResult.value : ''}" required>
                        <span>${p.unit || ''}</span>
                        <span>${p.refRange}</span>
                    </div>
                    `;
                }).join('');
                formHtml = `
                    <div id="edit-result-parameters-container" class="parameters-container">${paramResultsHtml}</div>
                    <textarea id="editResultNotes" placeholder="ملاحظات عامة">${item.notes || ''}</textarea>
                `;
                break;
            case 'test-definition':
                const materialsHtml = (item.materials || []).map(m => {
                    const material = inventory.find(i => i.id === m.id);
                    return `
                    <div class="consumed-material-item" data-id="${m.id}" data-quantity="${m.quantity}">
                        <span>${material ? material.name : 'مادة محذوفة'}</span>
                        <span>الكمية: ${m.quantity} ${material ? (material.unit || '') : ''}</span>
                    </div>`;
                }).join('');
                formHtml = `
                    <input type="text" id="editTestDefName" value="${item.name}" placeholder="اسم الفحص" required>
                    <div class="sub-form-container">
                        <h4>التحاليل الفرعية</h4>
                        <div id="editTestDefParametersContainer">${(item.parameters || []).map(p => `
                            <div class="parameter-entry-row">
                                <input type="text" class="param-name" value="${p.name}" required>
                                <input type="text" class="param-ref" value="${p.refRange}" required>
                                <input type="text" class="param-unit" value="${p.unit || ''}">
                                <button type="button" class="remove-param-btn">X</button>
                            </div>`).join('')}
                        </div>
                        <button type="button" id="addEditTestDefParamBtn" class="add-btn">إضافة تحليل فرعي</button>
                    </div>
                    <div class="sub-form-container">
                        <h4>المواد المستهلكة</h4>
                        <div id="editTestDefMaterialsList">${materialsHtml}</div>
                        <button type="button" id="openEditMaterialsModalBtn" class="add-btn">اختيار المواد</button>
                    </div>`;
                break;
            case 'user':
                if (item.isDefaultAdmin) {
                    alert('لا يمكن تعديل حساب المدير الافتراضي.');
                    return;
                }
                const permissionsHtml = Object.keys(PERMISSIONS).map(key => {
                    if (key === 'canManageUsers') return '';
                    const isChecked = item.permissions[key];
                    return `<label><input type="checkbox" name="permission" value="${key}" ${isChecked ? 'checked' : ''}> ${PERMISSIONS[key]}</label>`;
                }).join('');
                formHtml = `
                    <input type="text" id="editUsername" value="${item.username}" placeholder="اسم المستخدم" required>
                    <input type="password" id="editUserPassword" placeholder="كلمة مرور جديدة (اتركها فارغة لعدم التغيير)">
                    <textarea id="editUserAdminNotes" placeholder="ملاحظات المدير (خاصة)">${item.adminNotes || ''}</textarea>
                    <div class="sub-form-container">
                        <h4>الصلاحيات</h4>
                        <div id="editUserPermissionsContainer" class="checkbox-container">${permissionsHtml}</div>
                    </div>`;
                break;
        }
        
        editForm.innerHTML = formHtml + `<button type="submit">حفظ التعديلات</button>`;
        editForm.dataset.id = id;
        editForm.dataset.type = type;
        editModal.style.display = 'block';
    };

    editForm.addEventListener('submit', e => {
        e.preventDefault();
        const { id, type } = e.target.dataset;
        const data = { patient: patients, test: tests, result: results, inventory: inventory, 'test-definition': testDefinitions, user: users };
        const numericIdTypes = ['test', 'result'];
        const searchId = numericIdTypes.includes(type) ? parseInt(id) : id;
        const item = data[type].find(i => i.id === searchId);
        
        switch (type) {
            case 'patient':
                const newNationalId = document.getElementById('editPatientNationalId').value;
                if (newNationalId && patients.some(p => p.id !== id && p.nationalId === newNationalId)) {
                    alert('الرقم الوطني مسجل بالفعل لمريض آخر.');
                    return;
                }
                item.nationalId = newNationalId;
                item.name = document.getElementById('editPatientName').value;
                item.age = document.getElementById('editPatientAge').value;
                item.gender = document.getElementById('editPatientGender').value;
                item.phone = document.getElementById('editPatientPhone').value;
                item.record = document.getElementById('editPatientRecord').value;
                break;
            case 'test':
                item.type = document.getElementById('editTestType').value;
                item.status = document.getElementById('editTestStatus').value;
                break;
            case 'inventory':
                item.name = document.getElementById('editItemName').value;
                item.unit = document.getElementById('editItemUnit').value;
                item.currentStock = parseInt(document.getElementById('editCurrentStock').value);
                item.reorderLevel = parseInt(document.getElementById('editReorderLevel').value);
                break;
            case 'result':
                item.parameterResults = [];
                document.querySelectorAll('#edit-result-parameters-container .parameter-entry-row').forEach(paramRow => {
                    item.parameterResults.push({
                        name: paramRow.dataset.name,
                        refRange: paramRow.dataset.ref,
                        unit: paramRow.dataset.unit,
                        value: paramRow.querySelector('input[type="text"]').value,
                    });
                });
                item.notes = document.getElementById('editResultNotes').value;
                break;
            case 'test-definition':
                const oldName = item.name;
                const newName = document.getElementById('editTestDefName').value.trim();
            
                if (!newName) {
                    alert('اسم الفحص لا يمكن أن يكون فارغاً.');
                    return;
                }

                if (newName.toLowerCase() !== oldName.toLowerCase() && testDefinitions.some(def => def.name.trim().toLowerCase() === newName.toLowerCase() && def.id !== id)) {
                    alert('يوجد نوع تحليل آخر بنفس الاسم. الرجاء اختيار اسم فريد.');
                    return;
                }
            
                item.name = newName;
                item.parameters = [];
                document.querySelectorAll('#editTestDefParametersContainer .parameter-entry-row').forEach(paramRow => {
                    item.parameters.push({
                        name: paramRow.querySelector('.param-name').value,
                        refRange: paramRow.querySelector('.param-ref').value,
                        unit: paramRow.querySelector('.param-unit').value,
                    });
                });
                item.materials = [];
                document.querySelectorAll('#editTestDefMaterialsList .consumed-material-item').forEach(matItem => {
                    item.materials.push({
                        id: matItem.dataset.id,
                        quantity: parseInt(matItem.dataset.quantity)
                    });
                });
            
                if (oldName !== newName) {
                    tests.forEach(t => {
                        if (t.type === oldName) {
                            t.type = newName;
                        }
                    });
                    archive.forEach(a => {
                        a.tests.forEach(t => {
                            if (t.type === oldName) {
                                t.type = newName;
                            }
                        });
                    });
                }
                break;
            case 'user':
                const newUsername = document.getElementById('editUsername').value.trim();
                const newPassword = document.getElementById('editUserPassword').value;
                const newAdminNotes = document.getElementById('editUserAdminNotes').value;

                if (newUsername.toLowerCase() !== item.username.toLowerCase() && users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
                    alert('اسم المستخدم هذا موجود بالفعل.');
                    return;
                }
                item.username = newUsername;

                if (newPassword) {
                    if (newPassword.length < 4) {
                        alert('يجب أن تكون كلمة المرور 4 أحرف على الأقل.');
                        return;
                    }
                    item.password = newPassword;
                }

                item.permissions = {};
                document.querySelectorAll('#editUserPermissionsContainer input:checked').forEach(cb => item.permissions[cb.value] = true);
                item.adminNotes = newAdminNotes;
                break;
        }
        
        saveData();
        renderAll();
        closeModal();
    });

    editForm.addEventListener('click', e => {
        if (editForm.dataset.type !== 'test-definition' && editForm.dataset.type !== 'user') return;
    
        if (e.target.id === 'addEditTestDefParamBtn') {
            const container = document.getElementById('editTestDefParametersContainer');
            const row = document.createElement('div');
            row.className = 'parameter-entry-row';
            row.innerHTML = `<input type="text" class="param-name" placeholder="اسم التحليل الفرعي" required> <input type="text" class="param-ref" placeholder="النطاق المرجعي" required> <input type="text" class="param-unit" placeholder="الوحدة"> <button type="button" class="remove-param-btn">X</button>`;
            container.appendChild(row);
        }
    
        if (e.target.classList.contains('remove-param-btn')) {
            e.target.closest('.parameter-entry-row').remove();
        }
    
        if (e.target.id === 'openEditMaterialsModalBtn') {
            materialListTargetId = 'editTestDefMaterialsList';
            openMaterialsModal();
        }
    });

    const closeModal = () => { editModal.style.display = 'none'; };
    closeBtn.onclick = closeModal;
    window.onclick = e => { if (e.target == editModal) closeModal(); };

    // --- SEARCH ---
    searchInput.addEventListener('keyup', () => {
        const term = searchInput.value.toLowerCase();
        const activeSectionId = document.querySelector('.content-section.active')?.id;
        
        if (!activeSectionId) return;
        const data = { patients, tests, results, inventory, 'test-definitions': testDefinitions, consumed: consumedLog, archive: archive, users: users };

        const filterFunctions = {
            patients: d => d.filter(p => p.name.toLowerCase().includes(term) || (p.phone || '').includes(term) || (p.nationalId && p.nationalId.toLowerCase().includes(term))),
            tests: d => d.filter(t => {
                const p = patients.find(p => p.id === t.patientId);
                return t.type.toLowerCase().includes(term) || (p && p.name.toLowerCase().includes(term));
            }),
            results: d => d.filter(r => {
                const test = tests.find(t => t.id === r.testId);
                const patient = test ? patients.find(p => p.id === test.patientId) : null;
                return (test && test.type.toLowerCase().includes(term)) || (patient && patient.name.toLowerCase().includes(term));
            }),
            consumed: d => d.filter(log => log.materialName.toLowerCase().includes(term) || log.testType.toLowerCase().includes(term) || String(log.testId).includes(term)),
            inventory: d => d.filter(i => i.name.toLowerCase().includes(term)),
            'test-definitions': d => d.filter(def => def.name.toLowerCase().includes(term) || (def.parameters || []).some(p => p.name.toLowerCase().includes(term))),
            archive: d => d.filter(item => item.patient.name.toLowerCase().includes(term)),
            users: d => d.filter(u => u.username.toLowerCase().includes(term))
        };

        const renderFunctions = {
            patients: renderPatients,
            tests: renderTests,
            results: renderResults,
            inventory: renderInventory,
            'test-definitions': renderTestDefinitions,
            consumed: renderConsumedLog,
            archive: renderArchive,
            users: renderUsers
        };

        if(filterFunctions[activeSectionId]) {
            const filteredData = filterFunctions[activeSectionId](data[activeSectionId]);
            renderFunctionsactiveSectionId;
        }
    });

    // --- CHART FUNCTIONS ---
    const updateTestsStatusChart = () => {
        const ctx = document.getElementById('testsStatusChart')?.getContext('2d');
        if (!ctx) return;
    
        if (testsStatusChartInstance) {
            testsStatusChartInstance.destroy();
        }
    
        const completedCount = tests.filter(t => t.status === 'مكتمل').length;
        const pendingCount = tests.filter(t => t.status === 'معلق').length;
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
    
        testsStatusChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['مكتمل', 'معلق'],
                datasets: [{
                    label: 'حالة الفحوصات',
                    data: [completedCount, pendingCount],
                    backgroundColor: ['rgba(46, 204, 113, 0.7)', 'rgba(231, 76, 60, 0.7)'],
                    borderColor: ['rgba(46, 204, 113, 1)', 'rgba(231, 76, 60, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { color: textColor } } }
            }
        });
    };

    const updateTestsByTypeChart = () => {
        const ctx = document.getElementById('testsByTypeChart')?.getContext('2d');
        if (!ctx) return;
    
        if (testsByTypeChartInstance) {
            testsByTypeChartInstance.destroy();
        }
    
        const testsCount = tests.reduce((acc, test) => {
            acc[test.type] = (acc[test.type] || 0) + 1;
            return acc;
        }, {});
    
        const labels = Object.keys(testsCount);
        const data = Object.values(testsCount);
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
        const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');
    
        testsByTypeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد الفحوصات',
                    data: data,
                    backgroundColor: 'rgba(74, 144, 226, 0.7)',
                    borderColor: 'rgba(74, 144, 226, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: borderColor } },
                    x: { ticks: { color: textColor }, grid: { color: borderColor } }
                },
                plugins: { legend: { display: false } }
            }
        });
    };

    // --- EXPORT TO CSV ---
    const exportToCsv = (filename, rows) => {
        const BOM = "\uFEFF";
        const csvContent = BOM + rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const sanitizeCsvField = (field) => {
        const str = String(field ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    exportPatientsBtn.addEventListener('click', () => {
        const headers = ["المعرف", "الرقم الوطني", "الاسم", "العمر", "الجنس", "الهاتف", "السجل الطبي"];
        const dataRows = patients.map(p => [
            sanitizeCsvField(p.id), sanitizeCsvField(p.nationalId), sanitizeCsvField(p.name), sanitizeCsvField(p.age),
            sanitizeCsvField(p.gender), sanitizeCsvField(p.phone), sanitizeCsvField(p.record)
        ]);
        exportToCsv("patients_data.csv", [headers, ...dataRows]);
    });

    exportTestsBtn.addEventListener('click', () => {
        const headers = ["معرف الفحص", "اسم المريض", "نوع الفحص", "تاريخ الطلب", "الحالة"];
        const dataRows = tests.map(t => {
            const patient = patients.find(p => p.id === t.patientId);
            return [
                sanitizeCsvField(t.id), sanitizeCsvField(patient ? patient.name : 'محذوف'),
                sanitizeCsvField(t.type), sanitizeCsvField(new Date(t.date).toLocaleDateString()), sanitizeCsvField(t.status)
            ];
        });
        exportToCsv("tests_data.csv", [headers, ...dataRows]);
    });

    exportInventoryBtn.addEventListener('click', () => {
        const headers = ["المعرف", "اسم المادة", "الكمية المستهلكة", "الكمية الحالية", "الوحدة", "حد إعادة الطلب"];
        const dataRows = inventory.map(i => {
            const totalConsumed = consumedLog
                .filter(log => log.materialId === i.id)
                .reduce((sum, log) => sum + log.quantity, 0);
            return [
                sanitizeCsvField(i.id), sanitizeCsvField(i.name), sanitizeCsvField(totalConsumed),
                sanitizeCsvField(i.currentStock), sanitizeCsvField(i.unit), sanitizeCsvField(i.reorderLevel)
            ];
        });
        exportToCsv("inventory_data.csv", [headers, ...dataRows]);
    });

    exportConsumedBtn.addEventListener('click', () => {
        const headers = ["اسم المادة", "الكمية المستهلكة", "الوحدة", "نوع الفحص", "معرف الفحص", "تاريخ الاستهلاك"];
        const dataRows = consumedLog.map(log => [
            sanitizeCsvField(log.materialName), sanitizeCsvField(log.quantity), sanitizeCsvField(log.unit),
            sanitizeCsvField(log.testType), sanitizeCsvField(log.testId), sanitizeCsvField(new Date(log.date).toLocaleString('ar-EG'))
        ]);
        exportToCsv("consumed_log.csv", [headers, ...dataRows]);
    });

    exportResultsBtn.addEventListener('click', () => {
        const headers = ["معرف النتيجة", "معرف الفحص", "اسم المريض", "نوع الفحص", "تفاصيل النتيجة", "ملاحظات", "تاريخ الإدخال"];
        const dataRows = results.map(r => {
            const test = tests.find(t => t.id === r.testId);
            const patient = test ? patients.find(p => p.id === test.patientId) : null;
            const patientName = patient ? patient.name : 'غير متوفر';
            const testType = test ? test.type : 'غير متوفر';
            const resultDate = new Date(r.date).toLocaleDateString();
            return [
                sanitizeCsvField(r.id), sanitizeCsvField(r.testId), sanitizeCsvField(patientName),
                sanitizeCsvField(testType), sanitizeCsvField((r.parameterResults || []).map(p => `${p.name}: ${p.value}`).join('; ')),
                sanitizeCsvField(r.notes), sanitizeCsvField(resultDate)
            ];
        });
        exportToCsv("results_data.csv", [headers, ...dataRows]);
    });

    // --- INITIALIZATION ---
    const renderAll = () => {
        renderPatients();
        renderTests();
        renderInventory();
        renderResults();
        renderTestDefinitions();
        renderConsumedLog();
        renderArchive();
        renderUsers();
        renderTodayCases();
        updateDashboard();
    };

    const defaultBackToPatients = () => {
        patientProfileSection.classList.remove('active');
        const patientsSection = document.getElementById('patients');
        patientsSection.classList.add('active');
        headerTitle.textContent = 'إدارة المرضى';
        renderPatients();
    };
    backToPatientsBtn.addEventListener('click', defaultBackToPatients);

    const updateSidebarHeader = () => {
        const sidebarLabName = document.getElementById('sidebarLabName');
        const sidebarLogo = document.getElementById('sidebarLogo');
        sidebarLabName.textContent = labSettings.name;
        if (labSettings.logo && labSettings.logo.startsWith('data:image')) {
            sidebarLogo.src = labSettings.logo;
            sidebarLogo.style.display = 'block';
        } else {
            sidebarLogo.style.display = 'none';
        }
    };

    const checkLogin = () => {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            completeLogin(JSON.parse(storedUser));
        } else {
            loginModal.style.display = 'flex';
            mainContainer.style.visibility = 'hidden';
        }
    };

    checkLogin();
});
