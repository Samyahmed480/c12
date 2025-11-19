document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    // IMPORTANT DATA MODEL CHANGE:
    // testDefinitions now contain a 'parameters' array for sub-tests.
    // results now contain a 'parameterResults' array instead of a single 'details' field.
    // Old data will not be compatible. It's recommended to clear localStorage if upgrading.
    let patients = JSON.parse(localStorage.getItem('patients')) || [];
    let tests = JSON.parse(localStorage.getItem('tests')) || [];
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let results = JSON.parse(localStorage.getItem('results')) || [];
    let testDefinitions = JSON.parse(localStorage.getItem('testDefinitions')) || [];
    let consumedLog = JSON.parse(localStorage.getItem('consumedLog')) || [];
    let labSettings = JSON.parse(localStorage.getItem('labSettings')) || {
        name: 'اسم المختبر',
        address: 'العنوان هنا',
        phone: 'رقم الهاتف هنا',
        email: 'البريد الإلكتروني هنا',
        logo: 'images/logo.png' // Default or empty
    };

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
    const settingsForm = document.getElementById('settingsForm');

    // Tables
    const patientsTableBody = document.querySelector('#patientsTable tbody');
    const testsTableBody = document.querySelector('#testsTable tbody');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const testDefinitionsTableBody = document.querySelector('#testDefinitionsTable tbody');
    const consumedTableBody = document.querySelector('#consumedTable tbody');

    const addTestDefParamBtn = document.getElementById('addTestDefParamBtn');
    const testDefParametersContainer = document.getElementById('testDefParametersContainer');
    const resultParametersContainer = document.getElementById('result-parameters-container');

    // Patient Profile Elements
    const patientProfileSection = document.getElementById('patient-profile');
    const backToPatientsBtn = document.getElementById('backToPatientsBtn');

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
    const exportConsumedBtn = document.getElementById('exportConsumedBtn');
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
            document.getElementById('consumed-nav').style.display = 'none';
            document.getElementById('settings-nav').style.display = 'none';
            alert('تم تسجيل الدخول كمستخدم عادي. صلاحيات التعديل والحذف معطلة.');
        } else {
            body.classList.remove('user-role');
            document.getElementById('inventory-nav').style.display = 'block';
            document.querySelector('a[href="#test-definitions"]').style.display = 'block';
            document.getElementById('consumed-nav').style.display = 'block';
            document.getElementById('settings-nav').style.display = 'block';
            alert('مرحباً أيها المدير! تم منح الوصول الكامل.');
        }

        loginModal.style.display = 'none';
        mainContainer.style.visibility = 'visible';

        // Initialize the rest of the app after login
        applyTheme(localStorage.getItem('theme') || 'light');
        updateSidebarHeader(); // NEW: Update sidebar with lab info
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
        localStorage.setItem('consumedLog', JSON.stringify(consumedLog));
        localStorage.setItem('labSettings', JSON.stringify(labSettings));
    };

    // --- RENDERING FUNCTIONS ---
    const renderPatients = (data = patients) => {
        patientsTableBody.innerHTML = data.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nationalId || 'غير مسجل'}</td>
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.gender}</td>
                <td>${p.phone}</td>
                <td>${p.record}</td>
                <td>
                    <button class="action-btn edit" data-id="${p.id}" data-type="patient">تعديل</button>
                    <button class="action-btn delete" data-id="${p.id}" data-type="patient">حذف</button>
                </td>
                <td>
                    <button class="action-btn view" data-id="${p.id}" data-type="patient-profile">عرض الملف</button>
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
                    <button class="action-btn edit" data-id="${r.id}" data-type="result">تعديل</button>
                    <button class="action-btn delete" data-id="${r.id}" data-type="result">حذف</button>
                    <button class="action-btn print" data-id="${r.id}">طباعة</button>
                </td>
            </tr>`;
        }).join('');
    };

    const renderInventory = (data = inventory) => {
        inventoryTableBody.innerHTML = data.map(i => {
            const totalConsumed = consumedLog
                .filter(log => log.materialId === i.id)
                .reduce((sum, log) => sum + log.quantity, 0);

            return `
            <tr class="${i.currentStock <= i.reorderLevel ? 'low-stock' : ''}">
                <td>${i.id}</td>
                <td>${i.name}</td>
                <td>${totalConsumed} ${i.unit || ''}</td>
                <td>${i.currentStock} ${i.unit || ''}</td>
                <td>${i.reorderLevel}</td>
                <td>
                    <button class="action-btn edit" data-id="${i.id}" data-type="inventory">تعديل</button>
                    <button class="action-btn delete" data-id="${i.id}" data-type="inventory">حذف</button>
                </td>
            </tr>`;
        }).join('');
    };

    const renderTestDefinitions = (data = testDefinitions) => {
        testDefinitionsTableBody.innerHTML = data.map(def => {
            const parametersHtml = def.parameters.map(p => `<li>${p.name} (${p.refRange} ${p.unit || ''})</li>`).join('');
            const materialsHtml = def.materials.map(m => {
                const item = inventory.find(i => i.id === m.id);
                return `<li>${item ? item.name : 'مادة محذوفة'}: ${m.quantity} ${item ? item.unit : ''}</li>`;
            }).join('');
    
            return `
            <tr>
                <td>${def.name}</td>
                <td><ul class="material-list">${parametersHtml || 'لا يوجد'}</ul></td>
                <td><ul class="material-list">${materialsHtml || 'لا يوجد'}</ul></td>
                <td>
                    <button class="action-btn edit" data-id="${def.id}" data-type="test-definition">تعديل</button>
                    <button class="action-btn delete" data-id="${def.id}" data-type="test-definition">حذف</button>
                </td>
            </tr>`;
        }).join('');
        populateTestTypesCheckboxes();
        updateAvailableMaterials('testDefMaterialsList', 'testDefMaterialSelectContainer');
    };

    const renderConsumedLog = (data = consumedLog) => {
        // Sort by date descending
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
            if ((targetId === 'inventory' || targetId === 'test-definitions' || targetId === 'consumed' || targetId === 'settings') && currentUserRole !== 'admin') {
                alert('ليس لديك الصلاحية للوصول إلى هذا القسم.');
                // Optional: navigate back to dashboard
                document.querySelector('a[href="#dashboard"]').click();
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
            patientProfileSection.classList.remove('active'); // Hide profile page on main nav click
            resultParametersContainer.innerHTML = ''; // Clear dynamic result form on navigation
            headerTitle.textContent = item.textContent;
            searchInput.value = '';
            if (targetId !== 'dashboard') {
                // Optionally destroy charts when leaving dashboard to save resources
            }
            if (targetId === 'settings') {
                renderSettingsPage();
            }
            renderAll();
        });
    });

    // --- FORM SUBMISSIONS ---
    patientForm.addEventListener('submit', e => {
        e.preventDefault();
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

        testDefinitions.push({
            id: `TD${Date.now()}`,
            name: document.getElementById('testDefName').value,
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
            // NEW: Log the consumption
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
            id: `R${Date.now()}`,
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
    
        selectElement.innerHTML = `<select><option value="" disabled selected>اختر مادة...</option>` +
            availableMaterials.map(item => `<option value="${item.id}">${item.name}</option>`).join('') + `</select><button type="button" class="add-material-btn">إضافة</button>`;
    };

    const addMaterialFromSelector = (listElementId, select) => {
        const list = document.getElementById(listElementId);
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
        updateAvailableMaterials(listElementId, select.parentElement);
    };

    document.getElementById('testDefMaterialSelectContainer').addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            const select = e.target.previousElementSibling;
            addMaterialFromSelector('testDefMaterialsList', select);
        }
    });

    // --- AUTO-POPULATE RESULT FORM ---
    document.getElementById('resultTestId').addEventListener('change', e => {
        const testId = e.target.value;
        const test = tests.find(t => t.id === testId);
        resultParametersContainer.innerHTML = ''; // Clear previous
        if (!test) return;

        const testDef = testDefinitions.find(def => def.name === test.type);
        if (!testDef) {
            alert('تعريف هذا التحليل غير موجود! لا يمكن إدخال النتائج.');
            return;
        }

        testDef.parameters.forEach(param => {
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

    // --- SETTINGS PAGE ---
    const renderSettingsPage = () => {
        document.getElementById('labName').value = labSettings.name;
        document.getElementById('labAddress').value = labSettings.address;
        document.getElementById('labPhone').value = labSettings.phone;
        document.getElementById('labEmail').value = labSettings.email;
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
        labSettings.name = document.getElementById('labName').value;
        labSettings.address = document.getElementById('labAddress').value;
        labSettings.phone = document.getElementById('labPhone').value;
        labSettings.email = document.getElementById('labEmail').value;
        labSettings.logo = document.getElementById('logoPreview').src; // Get the base64 from the preview
        saveData();
        updateSidebarHeader(); // Update the UI immediately
        alert('تم حفظ الإعدادات بنجاح!');
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
        if (target.classList.contains('delete-material-item')) {
            const itemToRemove = target.closest('.consumed-material-item');
            const listElement = itemToRemove.parentElement;
            itemToRemove.remove();
    
            const activeSectionId = document.querySelector('.content-section.active')?.id;
            const modalOpen = editModal.style.display === 'block';

            if (activeSectionId === 'test-definitions' || (modalOpen && editForm.dataset.type === 'test-definition')) {
                updateAvailableMaterials(listElement.id, listElement.id.replace('List', 'SelectContainer'));
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

    const handleViewProfile = (patientId) => {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;

        // Hide all main sections and show the profile section
        sections.forEach(sec => sec.classList.remove('active'));
        patientProfileSection.classList.add('active');
        
        // Update header
        headerTitle.textContent = `ملف المريض: ${patient.name}`;

        // Render the profile content
        renderPatientProfile(patient);
    };

    const renderPatientProfile = (patient) => {
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
                ? `<button class="action-btn print" data-id="${result.id}">طباعة</button>` 
                : `<button class="action-btn" disabled>معلق</button>`;

            return `<tr>
                <td>${index + 1}</td><td>${test.type}</td><td>${new Date(test.date).toLocaleDateString('ar-EG')}</td><td>${test.status}</td><td>${printButton}</td>
            </tr>`;
        }).join('');
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
                        ${result.parameterResults.map(p => `
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
                const paramResultsHtml = resTestDef.parameters.map(p => {
                    const savedResult = item.parameterResults.find(pr => pr.name === p.name);
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
                const materialsHtml = item.materials.map(m => `
                    <div class="consumed-material-item" data-id="${m.id}">
                        <span>${inventory.find(i => i.id === m.id)?.name || 'محذوف'}</span>
                        <input type="number" value="${m.quantity}" min="1" required>
                        <input type="hidden" value="${m.id}">
                        <button type="button" class="action-btn delete delete-material-item">X</button>
                    </div>`).join('');
                formHtml = `
                    <input type="text" id="editTestDefName" value="${item.name}" placeholder="اسم الفحص" required>
                    <div class="sub-form-container">
                        <h4>التحاليل الفرعية</h4>
                        <div id="editTestDefParametersContainer">${item.parameters.map(p => `
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
                        <div class="add-material-controls">
                            <div id="editTestDefMaterialSelectContainer"></div>
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
            document.getElementById('addEditTestDefParamBtn').addEventListener('click', () => {
                const container = document.getElementById('editTestDefParametersContainer');
                const row = document.createElement('div');
                row.className = 'parameter-entry-row';
                row.innerHTML = `<input type="text" class="param-name" placeholder="اسم التحليل الفرعي" required> <input type="text" class="param-ref" placeholder="النطاق المرجعي" required> <input type="text" class="param-unit" placeholder="الوحدة"> <button type="button" class="remove-param-btn">X</button>`;
                container.appendChild(row);
            });
            document.getElementById('editTestDefParametersContainer').addEventListener('click', e => {
                if (e.target.classList.contains('remove-param-btn')) e.target.closest('.parameter-entry-row').remove();
            });
            document.getElementById('editTestDefMaterialSelectContainer').addEventListener('click', e => {
                if (e.target.tagName === 'BUTTON') addMaterialFromSelector('editTestDefMaterialsList', e.target.previousElementSibling);
            });
            updateAvailableMaterials('editTestDefMaterialsList', 'editTestDefMaterialSelectContainer');
        }
    };

    editForm.addEventListener('submit', e => {
        e.preventDefault();
        const { id, type } = e.target.dataset;
        const data = { patient: patients, test: tests, result: results, inventory: inventory, 'test-definition': testDefinitions };
        const item = data[type].find(i => i.id === id);

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
                item.name = document.getElementById('editTestDefName').value;
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
        const activeSectionId = document.querySelector('.content-section.active')?.id;
        
        const data = { patients, tests, results, inventory, 'test-definitions': testDefinitions, consumed: consumedLog };

        const filterFunctions = {
            patients: d => d.filter(p => p.name.toLowerCase().includes(term) || p.phone.includes(term) || (p.nationalId && p.nationalId.toLowerCase().includes(term))),
            tests: d => d.filter(t => {
                const p = patients.find(p => p.id === t.patientId);
                return t.type.toLowerCase().includes(term) || (p && p.name.toLowerCase().includes(term));
            }),
            results: d => d.filter(r => {
                const test = tests.find(t => t.id === r.testId);
                const patient = test ? patients.find(p => p.id === test.patientId) : null;
                return (test && test.type.toLowerCase().includes(term)) || (patient && patient.name.toLowerCase().includes(term));
            }),
            consumed: d => d.filter(log => log.materialName.toLowerCase().includes(term) || log.testType.toLowerCase().includes(term) || log.testId.toLowerCase().includes(term)),
            inventory: d => d.filter(i => i.name.toLowerCase().includes(term)),
            'test-definitions': d => d.filter(def => def.name.toLowerCase().includes(term) || def.parameters.some(p => p.name.toLowerCase().includes(term))),
        };

        const renderFunctions = {
            patients: renderPatients,
            tests: renderTests,
            results: renderResults,
            inventory: renderInventory,
            'test-definitions': renderTestDefinitions,
            consumed: renderConsumedLog
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
                sanitizeCsvField(i.id),
                sanitizeCsvField(i.name),
                sanitizeCsvField(totalConsumed),
                sanitizeCsvField(i.currentStock),
                sanitizeCsvField(i.unit),
                sanitizeCsvField(i.reorderLevel)
            ];
        });
        exportToCsv("inventory_data.csv", [headers, ...dataRows]);
    });

    exportConsumedBtn.addEventListener('click', () => {
        const headers = ["اسم المادة", "الكمية المستهلكة", "الوحدة", "نوع الفحص", "معرف الفحص", "تاريخ الاستهلاك"];
        
        const dataRows = consumedLog.map(log => [
            sanitizeCsvField(log.materialName),
            sanitizeCsvField(log.quantity),
            sanitizeCsvField(log.unit),
            sanitizeCsvField(log.testType),
            sanitizeCsvField(log.testId),
            sanitizeCsvField(new Date(log.date).toLocaleString('ar-EG'))
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
                sanitizeCsvField(r.id),
                sanitizeCsvField(r.testId),
                sanitizeCsvField(patientName),
                sanitizeCsvField(testType),
                sanitizeCsvField(r.parameterResults.map(p => `${p.name}: ${p.value}`).join('; ')),
                sanitizeCsvField(r.notes),
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
        renderConsumedLog();
        updateDashboard();
    };

    backToPatientsBtn.addEventListener('click', () => {
        patientProfileSection.classList.remove('active');
        const patientsSection = document.getElementById('patients');
        patientsSection.classList.add('active');
        headerTitle.textContent = 'إدارة المرضى';
        renderPatients(); // Re-render to ensure it's up-to-date
    });

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
