document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let patients = JSON.parse(localStorage.getItem('patients')) || [];
    let tests = JSON.parse(localStorage.getItem('tests')) || [];
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let results = JSON.parse(localStorage.getItem('results')) || [];
    let testDefinitions = JSON.parse(localStorage.getItem('testDefinitions')) || [];

    // Role-based access control
    let currentUserRole = 'user'; // Default role

    // Chart instances
    let testsStatusChartInstance = null;
    let testsByTypeChartInstance = null;

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
    const inventoryForm = document.getElementById('inventoryForm');
    const resultForm = document.getElementById('resultForm');
    const testDefinitionForm = document.getElementById('testDefinitionForm');

    // Tables
    const patientsTableBody = document.querySelector('#patientsTable tbody');
    const testsTableBody = document.querySelector('#testsTable tbody');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const testDefinitionsTableBody = document.querySelector('#testDefinitionsTable tbody');

    // Dashboard Cards
    const totalPatientsCard = document.getElementById('totalPatients');
    const pendingTestsCard = document.getElementById('pendingTests');
    const totalResultsCard = document.getElementById('totalResults');
    const totalTestDefsCard = document.getElementById('totalTestDefs');
    const lowStockItemsCard = document.getElementById('lowStockItems');
    
    // Modal Elements
    const editModal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const editForm = document.getElementById('editForm');
    const closeBtn = document.querySelector('.close-btn');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const guestLoginBtn = document.getElementById('guestLoginBtn');

    // Export Buttons
    const exportPatientsBtn = document.getElementById('exportPatientsBtn');
    const exportTestsBtn = document.getElementById('exportTestsBtn');
    const exportInventoryBtn = document.getElementById('exportInventoryBtn');
    const exportResultsBtn = document.getElementById('exportResultsBtn');

    // --- LOGIN & ROLE MANAGEMENT ---
    const completeLogin = (role) => {
        currentUserRole = role;
        sessionStorage.setItem('userRole', currentUserRole);

        if (currentUserRole === 'user') {
            body.classList.add('user-role');
            // Also hide the nav links via JS for robustness
            document.getElementById('inventory-nav').style.display = 'none';
            document.querySelector('a[href="#test-definitions"]').style.display = 'none';
            alert('تم تسجيل الدخول كمستخدم عادي. صلاحيات التعديل والحذف معطلة.');
        } else {
            body.classList.remove('user-role');
            document.getElementById('inventory-nav').style.display = 'block';
            document.querySelector('a[href="#test-definitions"]').style.display = 'block';
            alert('مرحباً أيها المدير! تم منح الوصول الكامل.');
        }

        loginModal.style.display = 'none';
        mainContainer.style.visibility = 'visible';

        // Initialize the rest of the app after login
        applyTheme(localStorage.getItem('theme') || 'light');
        renderAll();
        const lowStockCount = inventory.filter(i => i.currentStock <= i.reorderLevel).length;
        if (lowStockCount > 0) {
            alert(`تنبيه: يوجد ${lowStockCount} مادة في المخزون وصلت إلى حد إعادة الطلب أو أقل.`);
        }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === 'admin123') {
            completeLogin('admin');
        } else {
            alert('كلمة المرور غير صحيحة.');
            passwordInput.value = '';
        }
    });

    guestLoginBtn.addEventListener('click', () => {
        completeLogin('user');
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('userRole');
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
        localStorage.setItem('patients', JSON.stringify(patients));
        localStorage.setItem('tests', JSON.stringify(tests));
        localStorage.setItem('inventory', JSON.stringify(inventory));
        localStorage.setItem('results', JSON.stringify(results));
        localStorage.setItem('testDefinitions', JSON.stringify(testDefinitions));
    };

    // --- RENDERING FUNCTIONS ---
    const renderPatients = (data = patients) => {
        patientsTableBody.innerHTML = data.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.gender}</td>
                <td>${p.phone}</td>
                <td>${p.record}</td>
                <td>
                    <button class="action-btn edit" data-id="${p.id}" data-type="patient">تعديل</button>
                    <button class="action-btn delete" data-id="${p.id}" data-type="patient">حذف</button>
                </td>
            </tr>`).join('');
        updatePatientDropdown();
    };

    const renderTests = (data = tests) => {
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
                    <button class="action-btn edit" data-id="${t.id}" data-type="test">تعديل</button>
                    <button class="action-btn delete" data-id="${t.id}" data-type="test">حذف</button>
                </td>
            </tr>`;
        }).join('');
        updateResultTestDropdown();
    };
    
    const renderResults = (data = results) => {
        resultsTableBody.innerHTML = data.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.testId}</td>
                <td>${r.details}</td>
                <td title="${r.notes || ''}">${(r.notes || '').substring(0, 20)}${ (r.notes || '').length > 20 ? '...' : ''}</td>
                <td>${r.refNum}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn edit" data-id="${r.id}" data-type="result">تعديل</button>
                    <button class="action-btn delete" data-id="${r.id}" data-type="result">حذف</button>
                    <button class="action-btn print" data-id="${r.id}">طباعة</button>
                </td>
            </tr>`).join('');
    };

    const renderInventory = (data = inventory) => {
        inventoryTableBody.innerHTML = data.map(i => `
            <tr class="${i.currentStock <= i.reorderLevel ? 'low-stock' : ''}">
                <td>${i.id}</td>
                <td>${i.name}</td>
                <td>${i.currentStock} ${i.unit || ''}</td>
                <td>${i.reorderLevel}</td>
                <td>
                    <button class="action-btn edit" data-id="${i.id}" data-type="inventory">تعديل</button>
                    <button class="action-btn delete" data-id="${i.id}" data-type="inventory">حذف</button>
                </td>
            </tr>`).join('');
    };

    const renderTestDefinitions = (data = testDefinitions) => {
        testDefinitionsTableBody.innerHTML = data.map(def => {
            const materialsHtml = def.materials.map(m => {
                const item = inventory.find(i => i.id === m.id);
                return `<li>${item ? item.name : 'مادة محذوفة'}: ${m.quantity} ${item ? item.unit : ''}</li>`;
            }).join('');
    
            return `
            <tr>
                <td>${def.name}</td>
                <td>${def.refRange}</td>
                <td><ul class="material-list">${materialsHtml || 'لا يوجد'}</ul></td>
                <td>
                    <button class="action-btn edit" data-id="${def.id}" data-type="test-definition">تعديل</button>
                    <button class="action-btn delete" data-id="${def.id}" data-type="test-definition">حذف</button>
                </td>
            </tr>`;
        }).join('');
        populateTestTypesCheckboxes();
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

    const updateResultTestDropdown = () => {
        const select = document.getElementById('resultTestId');
        const currentVal = select.value;
        select.innerHTML = '<option value="" disabled selected>اختر فحصًا لإضافة نتيجة</option>' +
            tests.filter(t => t.status === 'معلق').map(t => `<option value="${t.id}">${t.id} - ${t.type}</option>`).join('');
        select.value = currentVal;
    };

    // --- NAVIGATION ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if(item.id === 'logoutBtn') return;
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);

            // Security check for sensitive sections
            if ((targetId === 'inventory' || targetId === 'test-definitions') && currentUserRole !== 'admin') {
                alert('ليس لديك الصلاحية للوصول إلى هذا القسم.');
                // Optional: navigate back to dashboard
                document.querySelector('a[href="#dashboard"]').click();
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
            headerTitle.textContent = item.textContent;
            searchInput.value = '';
            if (targetId !== 'dashboard') {
                // Optionally destroy charts when leaving dashboard to save resources
            }
            renderAll();
        });
    });

    // --- FORM SUBMISSIONS ---
    patientForm.addEventListener('submit', e => {
        e.preventDefault();
        patients.push({
            id: `P${Date.now()}`,
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
                id: `T${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Add random part to avoid collision in fast loops
                patientId: patientId,
                type: checkbox.value,
                status: 'معلق',
                date: new Date(),
            });
        });

        tests.push(...newTests);
        saveData();
        renderAll(); // Use renderAll to update everything
        testForm.reset();
        alert(`تمت إضافة ${newTests.length} فحص/فحوصات بنجاح.`);
    });
    
    inventoryForm.addEventListener('submit', e => {
        e.preventDefault();
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
        const materials = [];
        document.querySelectorAll('#testDefMaterialsList .consumed-material-item').forEach(matItem => {
            materials.push({
                id: matItem.querySelector('input[type="hidden"]').value,
                quantity: parseInt(matItem.querySelector('input[type="number"]').value)
            });
        });
    
        testDefinitions.push({
            id: `TD${Date.now()}`,
            name: document.getElementById('testDefName').value,
            refRange: document.getElementById('testDefRefRange').value,
            materials: materials
        });
    
        saveData();
        renderTestDefinitions();
        updateDashboard();
        testDefinitionForm.reset();
        document.getElementById('testDefMaterialsList').innerHTML = '';
    });

    resultForm.addEventListener('submit', e => {
        e.preventDefault();
        const testId = document.getElementById('resultTestId').value;
        const test = tests.find(t => t.id === testId);
        if (!test) return;
        const testDef = testDefinitions.find(def => def.name === test.type);

        if (!testDef) {
            alert('خطأ: تعريف هذا التحليل غير موجود. لا يمكن تحديد المواد المستهلكة.');
            return;
        }

        let allMaterialsAvailable = true;
        testDef.materials.forEach(material => {
            const inventoryItem = inventory.find(i => i.id === material.id);
            if (!inventoryItem || inventoryItem.currentStock < material.quantity) {
                alert(`كمية غير كافية في المخزون للمادة: ${inventoryItem ? inventoryItem.name : 'مادة محذوفة'}`);
                allMaterialsAvailable = false;
            }
        });

        if (!allMaterialsAvailable) return;

        testDef.materials.forEach(material => {
            const inventoryItem = inventory.find(i => i.id === material.id);
            inventoryItem.currentStock -= material.quantity;
        });

        results.push({
            id: `R${Date.now()}`,
            testId: testId,
            refNum: testDef.refRange,
            details: document.getElementById('resultDetails').value,
            notes: document.getElementById('resultNotes').value, // Add notes
            date: new Date(),
        });

        test.status = 'مكتمل';

        saveData();
        renderAll();
        resultForm.reset();
        document.getElementById('resultRefNum').value = '';
    });

    // --- DYNAMIC MATERIALS FOR FORMS ---
    const updateAvailableMaterials = (listElementId, selectElementId) => {
        const listElement = document.getElementById(listElementId);
        const selectElement = document.getElementById(selectElementId);
        if (!listElement || !selectElement) return;
    
        const usedMaterialIds = new Set();
        listElement.querySelectorAll('.consumed-material-item').forEach(item => {
            usedMaterialIds.add(item.dataset.id);
        });
    
        const availableMaterials = inventory.filter(item => !usedMaterialIds.has(item.id));
    
        selectElement.innerHTML = '<option value="" disabled selected>اختر مادة...</option>' +
            availableMaterials.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
    };

    const addMaterialFromSelector = (listElementId, selectElementId) => {
        const list = document.getElementById(listElementId);
        const select = document.getElementById(selectElementId);
        if (!list || !select || !select.value) return;
    
        const materialId = select.value;
        const material = inventory.find(i => i.id === materialId);
        if (!material) return;
    
        const item = document.createElement('div');
        item.className = 'consumed-material-item';
        item.dataset.id = material.id;
    
        item.innerHTML = `
            <span>${material.name}</span>
            <input type="number" placeholder="الكمية" min="1" value="1" required>
            <input type="hidden" value="${material.id}">
            <button type="button" class="action-btn delete delete-material-item">X</button>
        `;
        list.appendChild(item);
        updateAvailableMaterials(listElementId, selectElementId);
    };

    document.getElementById('addTestDefMaterialBtn').addEventListener('click', () => addMaterialFromSelector('testDefMaterialsList', 'testDefMaterialSelect'));

    // --- AUTO-POPULATE RESULT FORM ---
    document.getElementById('resultTestId').addEventListener('change', e => {
        const testId = e.target.value;
        const test = tests.find(t => t.id === testId);
        if (!test) return;

        const testDef = testDefinitions.find(def => def.name === test.type);
        if (!testDef) {
            alert('تعريف هذا التحليل غير موجود! سيتم استخدام الحقول الفارغة.');
            document.getElementById('resultRefNum').value = '';
            return;
        }

        document.getElementById('resultRefNum').value = testDef.refRange;
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
        if (target.classList.contains('print')) {
            handlePrint(target.dataset.id);
        }
        if (target.classList.contains('delete-material-item')) {
            const itemToRemove = target.closest('.consumed-material-item');
            const listElement = itemToRemove.parentElement;
            itemToRemove.remove();
    
            const activeSectionId = document.querySelector('.content-section.active')?.id;
            const modalOpen = editModal.style.display === 'block';

            if (activeSectionId === 'test-definitions' || (modalOpen && editForm.dataset.type === 'test-definition')) {
                updateAvailableMaterials(listElement.id, listElement.id.replace('List', 'Select'));
            }
        }
    });

    const handleDelete = (id, type) => {
        if (currentUserRole !== 'admin') {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        if (!confirm('هل أنت متأكد من رغبتك في الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) return;

        switch (type) {
            case 'patient':
                const testsToDelete = tests.filter(t => t.patientId === id).map(t => t.id);
                results = results.filter(r => !testsToDelete.includes(r.testId));
                tests = tests.filter(t => t.patientId !== id);
                patients = patients.filter(p => p.id !== id);
                break;
            case 'test':
                results = results.filter(r => r.testId !== id);
                tests = tests.filter(t => t.id !== id);
                break;
            case 'result':
                results = results.filter(r => r.id !== id);
                break;
            case 'inventory':
                inventory = inventory.filter(i => i.id !== id);
                break;
            case 'test-definition':
                const def = testDefinitions.find(d => d.id === id);
                if (def && tests.some(t => t.type === def.name)) {
                    alert('لا يمكن حذف هذا النوع من التحاليل لأنه مستخدم في فحوصات حالية.');
                    return;
                }
                testDefinitions = testDefinitions.filter(d => d.id !== id);
                break;
        }
        saveData();
        renderAll();
    };

    const handlePrint = (resultId) => {
        // 1. Find the initial context (patient, date) from the clicked result
        const initialResult = results.find(r => r.id === resultId);
        if (!initialResult) { alert('لم يتم العثور على النتيجة!'); return; }
        const initialTest = tests.find(t => t.id === initialResult.testId);
        if (!initialTest) { alert('لم يتم العثور على الفحص المرتبط!'); return; }
        const patient = patients.find(p => p.id === initialTest.patientId);
        if (!patient) { alert('لم يتم العثور على المريض المرتبط!'); return; }
    
        const visitDate = new Date(initialTest.date).toLocaleDateString('ar-EG');
    
        // 2. Find all tests for this patient on the same date
        const testsForVisit = tests.filter(t => 
            t.patientId === patient.id && 
            new Date(t.date).toLocaleDateString('ar-EG') === visitDate
        );
    
        // 3. Gather all corresponding results for these tests
        const resultsForVisit = testsForVisit.map(test => {
            const result = results.find(r => r.testId === test.id);
            return result ? { test, result } : null;
        }).filter(Boolean); // Filter out any tests that don't have a result yet
    
        if (resultsForVisit.length === 0) {
            alert('لا توجد نتائج مكتملة لهذا المريض في هذا التاريخ.');
            return;
        }
    
        // 4. Generate the HTML for the consolidated report
        const resultsHtml = resultsForVisit.map(({ test, result }) => {
            const notesHtml = result.notes ? `
                <div class="report-notes-section">
                    <p><strong>ملاحظات الطبيب:</strong></p>
                    <p>${result.notes.replace(/\n/g, '<br>')}</p>
                </div>
            ` : '';

            return `
            <div class="report-results-section">
                <h3>${test.type}</h3>
                <div>
                    <p><strong>تاريخ الفحص:</strong> ${new Date(test.date).toLocaleDateString('ar-EG')}</p>
                    <p><strong>النتيجة:</strong></p>
                    <div>${result.details.replace(/\n/g, '<br>')}</div>
                    <hr>
                    <p><strong>النطاق المرجعي:</strong> ${result.refNum}</p>
                </div>
                ${notesHtml}
            </div>
        `;
        }).join('');
    
        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = `
            <div class="report-header">
                <img src="images/logo.png" alt="شعار المختبر">
                <h2>تقرير نتيجة المختبر</h2>
                <p>اسم المختبر - العنوان - رقم الهاتف</p>
            </div>
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

    const handleEdit = (id, type) => {
        if (currentUserRole !== 'admin') {
            alert('ليس لديك الصلاحية للقيام بهذا الإجراء.');
            return;
        }
        const data = { patient: patients, test: tests, result: results, inventory: inventory, 'test-definition': testDefinitions };
        const item = data[type].find(i => i.id === id);
        let formHtml = '';
        modalTitle.textContent = `تعديل ${type}`;

        switch (type) {
            case 'patient':
                formHtml = `
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
                formHtml = `
                    <input type="text" id="editResultRefNum" value="${item.refNum}" placeholder="الرقم المرجعي" required>
                    <textarea id="editResultDetails" placeholder="تفاصيل التحليل">${item.details}</textarea>
                    <textarea id="editResultNotes" placeholder="ملاحظات الطبيب">${item.notes || ''}</textarea>`;
                break;
            case 'test-definition':
                const materialsHtml = item.materials.map(m => `
                    <div class="consumed-material-item" data-id="${m.id}">
                        <span>${inventory.find(i => i.id === m.id)?.name || 'محذوف'}</span>
                        <input type="number" value="${m.quantity}" min="1" required>
                        <input type="hidden" value="${m.id}">
                        <button type="button" class="action-btn delete delete-material-item">X</button>
                    </div>`).join('');
                formHtml = `
                    <input type="text" id="editTestDefName" value="${item.name}" placeholder="اسم التحليل" required>
                    <input type="text" id="editTestDefRefRange" value="${item.refRange}" placeholder="النطاق المرجعي" required>
                    <div class="consumed-materials-container">
                        <h4>المواد المستهلكة</h4>
                        <div class="add-material-controls">
                            <select id="editTestDefMaterialSelect"></select>
                            <button type="button" id="addEditMaterialBtn" class="add-material-btn">إضافة</button>
                        </div>
                        <div id="editTestDefMaterialsList">${materialsHtml}</div>
                    </div>`;
                break;
        }
        
        editForm.innerHTML = formHtml + `<button type="submit">حفظ التعديلات</button>`;
        editForm.dataset.id = id;
        editForm.dataset.type = type;
        editModal.style.display = 'block';

        if (type === 'test-definition') {
            document.getElementById('addEditMaterialBtn').onclick = () => addMaterialFromSelector('editTestDefMaterialsList', 'editTestDefMaterialSelect');
            updateAvailableMaterials('editTestDefMaterialsList', 'editTestDefMaterialSelect');
        }
    };

    editForm.addEventListener('submit', e => {
        e.preventDefault();
        const { id, type } = e.target.dataset;
        const data = { patient: patients, test: tests, result: results, inventory: inventory, 'test-definition': testDefinitions };
        const item = data[type].find(i => i.id === id);

        switch (type) {
            case 'patient':
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
                item.refNum = document.getElementById('editResultRefNum').value;
                item.details = document.getElementById('editResultDetails').value;
                item.notes = document.getElementById('editResultNotes').value; // Update notes
                break;
            case 'test-definition':
                item.name = document.getElementById('editTestDefName').value;
                item.refRange = document.getElementById('editTestDefRefRange').value;
                item.materials = [];
                document.querySelectorAll('#editTestDefMaterialsList .consumed-material-item').forEach(matItem => {
                    item.materials.push({
                        id: matItem.querySelector('input[type="hidden"]').value,
                        quantity: parseInt(matItem.querySelector('input[type="number"]').value)
                    });
                });
                break;
        }
        
        saveData();
        renderAll();
        closeModal();
    });

    const closeModal = () => { editModal.style.display = 'none'; };
    closeBtn.onclick = closeModal;
    window.onclick = e => { if (e.target == editModal) closeModal(); };

    // --- SEARCH ---
    searchInput.addEventListener('keyup', () => {
        const term = searchInput.value.toLowerCase();
        const activeSectionId = document.querySelector('.content-section.active').id;
        
        const data = { patients, tests, results, inventory, 'test-definitions': testDefinitions };

        const filterFunctions = {
            patients: d => d.filter(p => p.name.toLowerCase().includes(term) || p.phone.includes(term)),
            tests: d => d.filter(t => {
                const p = patients.find(p => p.id === t.patientId);
                return t.type.toLowerCase().includes(term) || (p && p.name.toLowerCase().includes(term));
            }),
            results: d => d.filter(r => r.refNum.toLowerCase().includes(term) || r.testId.includes(term) || r.details.toLowerCase().includes(term) || (r.notes && r.notes.toLowerCase().includes(term))),
            inventory: d => d.filter(i => i.name.toLowerCase().includes(term)),
            'test-definitions': d => d.filter(def => def.name.toLowerCase().includes(term) || def.refRange.toLowerCase().includes(term)),
        };

        const renderFunctions = {
            patients: renderPatients,
            tests: renderTests,
            results: renderResults,
            inventory: renderInventory,
            'test-definitions': renderTestDefinitions,
        };

        if(filterFunctions[activeSectionId]) {
            const filteredData = filterFunctions[activeSectionId](data[activeSectionId]);
            renderFunctionsactiveSectionId;
        }
    });

    // --- CHART FUNCTIONS ---
    const updateTestsStatusChart = () => {
        const ctx = document.getElementById('testsStatusChart')?.getContext('2d');
        if (!ctx) return; // Don't run if not on dashboard
    
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
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.7)', // success-color
                        'rgba(231, 76, 60, 0.7)'   // danger-color
                    ],
                    borderColor: [
                        'rgba(46, 204, 113, 1)',
                        'rgba(231, 76, 60, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor
                        }
                    }
                }
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
                    backgroundColor: 'rgba(74, 144, 226, 0.7)', // primary-color
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
        const BOM = "\uFEFF"; // For UTF-8 support in Excel
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
        const headers = ["المعرف", "الاسم", "العمر", "الجنس", "الهاتف", "السجل الطبي"];
        const dataRows = patients.map(p => [
            sanitizeCsvField(p.id), sanitizeCsvField(p.name), sanitizeCsvField(p.age),
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
        const headers = ["المعرف", "اسم المادة", "الوحدة", "الكمية الحالية", "حد إعادة الطلب"];
        const dataRows = inventory.map(i => [
            sanitizeCsvField(i.id), sanitizeCsvField(i.name), sanitizeCsvField(i.unit),
            sanitizeCsvField(i.currentStock), sanitizeCsvField(i.reorderLevel)
        ]);
        exportToCsv("inventory_data.csv", [headers, ...dataRows]);
    });

    exportResultsBtn.addEventListener('click', () => {
        const headers = ["معرف النتيجة", "معرف الفحص", "اسم المريض", "نوع الفحص", "تفاصيل النتيجة", "ملاحظات", "النطاق المرجعي", "تاريخ الإدخال"];
        
        const dataRows = results.map(r => {
            const test = tests.find(t => t.id === r.testId);
            const patient = test ? patients.find(p => p.id === test.patientId) : null;
    
            const patientName = patient ? patient.name : 'غير متوفر';
            const testType = test ? test.type : 'غير متوفر';
            const resultDate = new Date(r.date).toLocaleDateString();
    
            return [
                sanitizeCsvField(r.id),
                sanitizeCsvField(r.testId),
                sanitizeCsvField(patientName),
                sanitizeCsvField(testType),
                sanitizeCsvField(r.details),
                sanitizeCsvField(r.notes),
                sanitizeCsvField(r.refNum),
                sanitizeCsvField(resultDate)
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
        updateDashboard();
    };

    const checkLogin = () => {
        const storedRole = sessionStorage.getItem('userRole');
        if (storedRole) {
            completeLogin(storedRole);
        } else {
            // Show login modal and hide app
            loginModal.style.display = 'flex';
            mainContainer.style.visibility = 'hidden';
        }
    };

    // Start the application by checking login status
    checkLogin();
});
