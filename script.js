// بررسی احراز هویت ادمین
let isAdmin = localStorage.getItem('admin_authenticated') === 'true';

// نمایش/پنهان کردن بخش ادمین
function updateAdminVisibility() {
    const adminMenu = document.querySelector('.admin-menu');
    if (adminMenu) {
        // منوی ادمین همیشه نمایش داده می‌شود تا کاربران بتوانند وارد شوند
        adminMenu.style.display = 'block';
        adminMenu.classList.remove('hidden-admin');
    }
}

// مدیریت ورود ادمین
function showAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('adminPasswordInput').focus();
    }
}

function hideAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminLoginError').textContent = '';
    }
}

// بررسی رمز عبور ادمین (از config.js)
function checkAdminPassword(password) {
    // اگر config.js موجود باشد و ADMIN_PASSWORD تعریف شده باشد استفاده می‌کنیم
    if (typeof ADMIN_PASSWORD !== 'undefined') {
        return password === ADMIN_PASSWORD;
    }
    // در غیر این صورت از رمز پیش‌فرض استفاده می‌کنیم
    return password === 'admin123'; // ⚠️ این را در config.js تغییر دهید!
}

// مدیریت ذخیره‌سازی در JSONBin.io
// ذخیره داده‌ها در JSONBin.io
async function saveToJSONBin(data) {
    if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
        return false;
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(data)
        });

        return response.ok;
    } catch (error) {
        console.error('خطا در ارتباط با JSONBin:', error);
        return false;
    }
}

// دریافت داده‌ها از JSONBin.io
async function loadFromJSONBin() {
    if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
        return null;
    }

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });

        if (response.ok) {
            const result = await response.json();
            return result.record || null;
        }
        return null;
    } catch (error) {
        console.error('خطا در ارتباط با JSONBin:', error);
        return null;
    }
}

// بارگذاری داده‌ها از JSONBin.io (برای ادمین)
async function loadAllDataFromJSONBin() {
    if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
        return false;
    }

    const data = await loadFromJSONBin();
    if (data) {
        persons = data.persons || [];
        paymentTypes = data.paymentTypes || [];
        treatments = data.treatments || [];
        doctors = data.doctors || [];
        
        // ذخیره در localStorage هم (برای fallback)
        localStorage.setItem('persons', JSON.stringify(persons));
        localStorage.setItem('paymentTypes', JSON.stringify(paymentTypes));
        localStorage.setItem('treatments', JSON.stringify(treatments));
        localStorage.setItem('doctors', JSON.stringify(doctors));
        
        return true;
    }
    return false;
}

// داده‌های ذخیره شده
let persons = JSON.parse(localStorage.getItem('persons')) || [];
let paymentTypes = JSON.parse(localStorage.getItem('paymentTypes')) || [];
let treatments = JSON.parse(localStorage.getItem('treatments')) || [];
let doctors = JSON.parse(localStorage.getItem('doctors')) || [];

// ترتیب سودآوری
const profitabilityOrder = {
    'very-high': 1,
    'high': 2,
    'medium': 3,
    'low': 4,
    'very-low': 5
};

// حذف شده - دیگر نیازی به ترجمه نیست

// ترجمه سطوح سودآوری
const profitabilityLabels = {
    'very-high': 'خیلی پرسود',
    'high': 'پرسود',
    'medium': 'متوسط',
    'low': 'کم‌سود',
    'very-low': 'خیلی کم‌سود'
};

// مدیریت صفحه اسپلش
window.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash');
    const mainApp = document.getElementById('mainApp');
    
    setTimeout(() => {
        splash.classList.add('hidden');
        mainApp.classList.remove('hidden');
    }, 2500);
});

// مدیریت منوی رستورانی
document.querySelectorAll('.menu-category').forEach(category => {
    category.addEventListener('click', () => {
        const sectionId = category.dataset.section;
        
        // اگر روی منوی ادمین کلیک شد و کاربر ادمین نیست، مودال ورود را نمایش بده
        if (sectionId === 'admin' && !isAdmin) {
            showAdminLogin();
            return;
        }
        
        // حذف active از همه
        document.querySelectorAll('.menu-category').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        
        // اضافه کردن active به آیتم انتخاب شده
        category.classList.add('active');
        document.getElementById(sectionId).classList.add('active');
        
        // اگر بخش ادمین فعال شد، پنل را رندر کن
        if (sectionId === 'admin' && isAdmin) {
            // بارگذاری داده‌ها از JSONBin.io
            loadAllDataFromJSONBin().then(loaded => {
                if (loaded) {
                    renderPersonList();
                    renderPaymentList();
                    renderTreatmentList();
                    renderDoctorList();
                }
                renderAdminPanel();
            }).catch(() => {
                renderAdminPanel();
            });
        }
        
        // به‌روزرسانی select های شخص در بخش فعال
        setTimeout(() => updateCurrentUserDisplay(), 100);
    });
});

// ذخیره اطلاعات کاربر فعلی (بدون بارگذاری از localStorage - باید دوباره ثبت نام کند)
let currentUser = null;

// فرم ثبت نام شخص
const personForm = document.getElementById('personForm');
if (personForm) {
    personForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // چک کردن اینکه آیا کاربر قبلاً ثبت نام کرده است
        if (currentUser) {
            showNotification('شما قبلاً ثبت نام کرده‌اید! هر فرد فقط می‌تواند یک بار ثبت نام کند.', 'error');
            return;
        }
        
        const formData = new FormData(personForm);
        const firstName = formData.get('personFirstName').trim();
        const lastName = formData.get('personLastName').trim();
        
        // چک کردن اینکه آیا این نام و نام خانوادگی قبلاً ثبت شده است
        const existingPerson = persons.find(p => 
            p.firstName.trim() === firstName && p.lastName.trim() === lastName
        );
        
        if (existingPerson) {
            showNotification('این نام و نام خانوادگی قبلاً ثبت شده است!', 'error');
            return;
        }
        
        const personData = {
            id: Date.now(),
            firstName: firstName,
            lastName: lastName,
            createdAt: new Date().toLocaleString('fa-IR')
        };
        
        persons.push(personData);
        savePersons();
        
        // ذخیره کاربر فعلی
        currentUser = {
            id: personData.id,
            firstName: personData.firstName,
            lastName: personData.lastName
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        renderPersonList();
        updateCurrentUserDisplay();
        personForm.reset();
        
        // نمایش پیام موفقیت
        showNotification('نام شما با موفقیت ثبت شد!', 'success');
    });
}

// به‌روزرسانی نمایش نام کاربر در فرم‌ها (فقط پروفایل)
function updateCurrentUserDisplay() {
    const profileElements = ['paymentProfile', 'treatmentProfile', 'doctorProfile'];
    
    if (currentUser) {
        const fullName = `${currentUser.firstName} ${currentUser.lastName}`;
        
        // نمایش پروفایل در بالای فرم‌ها
        profileElements.forEach(profileId => {
            const profile = document.getElementById(profileId);
            if (profile) {
                const nameEl = profile.querySelector('.profile-name');
                if (nameEl) {
                    nameEl.textContent = fullName;
                }
                profile.style.display = 'block';
            }
        });
        
        // غیرفعال کردن فرم ثبت نام شخص اگر کاربر قبلاً ثبت نام کرده
        const personForm = document.getElementById('personForm');
        if (personForm) {
            const firstNameInput = document.getElementById('personFirstName');
            const lastNameInput = document.getElementById('personLastName');
            const submitButton = personForm.querySelector('button[type="submit"]');
            
            if (firstNameInput) {
                firstNameInput.disabled = true;
                firstNameInput.placeholder = 'شما قبلاً ثبت نام کرده‌اید';
            }
            if (lastNameInput) {
                lastNameInput.disabled = true;
                lastNameInput.placeholder = 'شما قبلاً ثبت نام کرده‌اید';
            }
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'قبلاً ثبت نام کرده‌اید';
            }
        }
    } else {
        // مخفی کردن پروفایل اگر کاربری ثبت نشده
        profileElements.forEach(profileId => {
            const profile = document.getElementById(profileId);
            if (profile) {
                profile.style.display = 'none';
            }
        });
        
        // فعال کردن فرم ثبت نام شخص اگر کاربر ثبت نام نکرده
        const personForm = document.getElementById('personForm');
        if (personForm) {
            const firstNameInput = document.getElementById('personFirstName');
            const lastNameInput = document.getElementById('personLastName');
            const submitButton = personForm.querySelector('button[type="submit"]');
            
            if (firstNameInput) {
                firstNameInput.disabled = false;
                firstNameInput.placeholder = 'نام را وارد کنید';
            }
            if (lastNameInput) {
                lastNameInput.disabled = false;
                lastNameInput.placeholder = 'نام خانوادگی را وارد کنید';
            }
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'ثبت نام شخص';
            }
        }
    }
}

// فرم انواع پرداخت
const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('ابتدا باید نام خود را در بخش "ثبت نام شخص" ثبت کنید!', 'info');
            return;
        }
        
        const formData = new FormData(paymentForm);
        const paymentData = {
            id: Date.now(),
            personId: currentUser.id,
            type: formData.get('paymentType'),
            score: parseInt(formData.get('paymentScore')),
            description: formData.get('paymentDescription') || null,
            createdAt: new Date().toLocaleString('fa-IR')
        };
        
        paymentTypes.push(paymentData);
        savePaymentTypes();
        renderPaymentList();
        paymentForm.reset();
        showNotification('روش پرداخت با موفقیت ثبت شد!', 'success');
    });
}

// فرم انواع درمان
const treatmentForm = document.getElementById('treatmentForm');
if (treatmentForm) {
    treatmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('ابتدا باید نام خود را در بخش "ثبت نام شخص" ثبت کنید!', 'info');
            return;
        }
        
        const formData = new FormData(treatmentForm);
        const treatmentData = {
            id: Date.now(),
            personId: currentUser.id,
            name: formData.get('treatmentName'),
            profitability: formData.get('profitability'),
            cost: formData.get('treatmentCost') || null,
            description: formData.get('treatmentDescription') || null,
            createdAt: new Date().toLocaleString('fa-IR')
        };
        
        treatments.push(treatmentData);
        saveTreatments();
        renderTreatmentList();
        treatmentForm.reset();
        showNotification('درمان با موفقیت ثبت شد!', 'success');
    });
}

// فرم ثبت نام دکتر
const doctorForm = document.getElementById('doctorForm');
if (doctorForm) {
    doctorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('ابتدا باید نام خود را در بخش "ثبت نام شخص" ثبت کنید!', 'info');
            return;
        }
        
        const formData = new FormData(doctorForm);
        const doctorData = {
            id: Date.now(),
            personId: currentUser.id,
            name: formData.get('doctorName'),
            createdAt: new Date().toLocaleString('fa-IR')
        };
        
        doctors.push(doctorData);
        saveDoctors();
        renderDoctorList();
        doctorForm.reset();
        showNotification('نام پزشک با موفقیت ثبت شد!', 'success');
    });
}

// نمایش لیست اشخاص
function renderPersonList() {
    const list = document.getElementById('personList');
    if (!list) return;
    
    if (persons.length === 0) {
        list.innerHTML = '<li class="empty-message">هنوز شخصی ثبت نشده است</li>';
        return;
    }
    
    list.innerHTML = persons.map(person => {
        const personPayments = paymentTypes.filter(p => p.personId === person.id).length;
        const personTreatments = treatments.filter(t => t.personId === person.id).length;
        const personDoctors = doctors.filter(d => d.personId === person.id).length;
        
        return `
            <li>
                <div class="item-content">
                    <div class="item-title">${person.firstName} ${person.lastName}</div>
                    <div class="item-details" style="margin-top: 8px;">
                        <span style="color: #b0b0b0;">پرداخت‌ها: ${personPayments} | درمان‌ها: ${personTreatments} | پزشکان: ${personDoctors}</span>
                    </div>
                    <div class="item-details" style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                        ثبت شده در: ${person.createdAt}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-view" data-person-id="${person.id}" style="margin-left: 10px;">👁️ مشاهده فرم‌ها</button>
                    <button class="btn-delete-person" data-person-id="${person.id}">حذف</button>
                </div>
            </li>
        `;
    }).join('');
    
    updateCurrentUserDisplay();
}

// نمایش لیست پرداخت‌ها
function renderPaymentList() {
    const list = document.getElementById('paymentList');
    if (!list) return;
    
    if (paymentTypes.length === 0) {
        list.innerHTML = '<li class="empty-message">هنوز روش پرداختی ثبت نشده است</li>';
        return;
    }
    
    // مرتب‌سازی بر اساس امتیاز (بیشترین به کمترین)
    const sortedPayments = [...paymentTypes].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    list.innerHTML = sortedPayments.map(payment => {
        const scoreStars = '⭐'.repeat(payment.score || 0);
        const person = persons.find(p => p.id === payment.personId);
        const personName = person ? `${person.firstName} ${person.lastName}` : 'نامشخص';
        
        return `
            <li>
                <div class="item-content">
                    <div class="item-title">${payment.type}</div>
                    <div class="item-details" style="margin-top: 8px; color: #b0b0b0;">
                        👤 ${personName}
                    </div>
                    <div class="item-details" style="margin-top: 10px;">
                        <span class="score-badge">امتیاز: ${payment.score}/10 ${scoreStars}</span>
                    </div>
                    ${payment.description ? `<div class="item-details" style="margin-top: 10px;">${payment.description}</div>` : ''}
                    <div class="item-details" style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                        ثبت شده در: ${payment.createdAt}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-delete-payment" data-payment-id="${payment.id}">حذف</button>
                </div>
            </li>
        `;
    }).join('');
}

// نمایش لیست درمان‌ها
function renderTreatmentList() {
    const list = document.getElementById('treatmentList');
    if (!list) return;
    
    if (treatments.length === 0) {
        list.innerHTML = '<li class="empty-message">هنوز درمانی ثبت نشده است</li>';
        return;
    }
    
    // مرتب‌سازی بر اساس سودآوری
    const sortedTreatments = [...treatments].sort((a, b) => {
        return profitabilityOrder[a.profitability] - profitabilityOrder[b.profitability];
    });
    
    list.innerHTML = sortedTreatments.map(treatment => {
        const profitabilityLabel = profitabilityLabels[treatment.profitability] || treatment.profitability;
        const badgeClass = `badge-${treatment.profitability}`;
        const costPart = treatment.cost ? `${Number(treatment.cost).toLocaleString('fa-IR')} تومان` : '';
        const person = persons.find(p => p.id === treatment.personId);
        const personName = person ? `${person.firstName} ${person.lastName}` : 'نامشخص';
        
        return `
            <li>
                <div class="item-content">
                    <div class="item-title">${treatment.name}</div>
                    <div class="item-details" style="margin-top: 8px; color: #b0b0b0;">
                        👤 ${personName}
                    </div>
                    <div class="item-details">
                        <span class="item-badge ${badgeClass}">${profitabilityLabel}</span>
                        ${costPart ? ` - ${costPart}` : ''}
                    </div>
                    ${treatment.description ? `<div class="item-details" style="margin-top: 10px;">${treatment.description}</div>` : ''}
                    <div class="item-details" style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                        ثبت شده در: ${treatment.createdAt}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-delete-treatment" data-treatment-id="${treatment.id}">حذف</button>
                </div>
            </li>
        `;
    }).join('');
}

// حذف پرداخت
function deletePayment(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این روش پرداخت را حذف کنید؟')) {
        paymentTypes = paymentTypes.filter(p => p.id !== id);
        savePaymentTypes();
        renderPaymentList();
        showNotification('روش پرداخت حذف شد', 'info');
    }
}

// حذف درمان
function deleteTreatment(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این درمان را حذف کنید؟')) {
        treatments = treatments.filter(t => t.id !== id);
        saveTreatments();
        renderTreatmentList();
        showNotification('درمان حذف شد', 'info');
    }
}

// نمایش لیست پزشکان
function renderDoctorList() {
    const list = document.getElementById('doctorList');
    if (!list) return;
    
    if (doctors.length === 0) {
        list.innerHTML = '<li class="empty-message">هنوز پزشکی ثبت نشده است</li>';
        return;
    }
    
    list.innerHTML = doctors.map(doctor => {
        const person = persons.find(p => p.id === doctor.personId);
        const personName = person ? `${person.firstName} ${person.lastName}` : 'نامشخص';
        
        return `
            <li>
                <div class="item-content">
                    <div class="item-title">${doctor.name}</div>
                    <div class="item-details" style="margin-top: 8px; color: #b0b0b0;">
                        👤 ${personName}
                    </div>
                    <div class="item-details" style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                        ثبت شده در: ${doctor.createdAt}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-delete-doctor" data-doctor-id="${doctor.id}">حذف</button>
                </div>
            </li>
        `;
    }).join('');
}

// مشاهده فرم‌های یک شخص
function viewPersonForms(personId) {
    const person = persons.find(p => p.id === personId);
    if (!person) return;

    const personPayments = paymentTypes.filter(p => p.personId === personId);
    const personTreatments = treatments.filter(t => t.personId === personId);
    const personDoctors = doctors.filter(d => d.personId === personId);

    const modal = document.createElement('div');
    modal.className = 'person-modal';
    modal.innerHTML = `
        <div class="person-modal-content">
            <div class="person-modal-header">
                <h2>فرم‌های ${person.firstName} ${person.lastName}</h2>
                <button class="modal-close">✕</button>
            </div>
            <div class="person-modal-body">
                <div class="person-forms-section">
                    <h3>💳 پرداخت‌ها (${personPayments.length})</h3>
                    ${personPayments.length === 0 
                        ? '<p class="empty-section">پرداختی ثبت نشده است</p>'
                        : personPayments.map(p => `
                            <div class="person-form-item">
                                <div class="form-item-title">${p.type}</div>
                                <div class="form-item-detail">امتیاز: ${p.score}/10 ⭐</div>
                                ${p.description ? `<div class="form-item-detail">${p.description}</div>` : ''}
                                <div class="form-item-date">${p.createdAt}</div>
                            </div>
                        `).join('')
                    }
                </div>

                <div class="person-forms-section">
                    <h3>🦷 درمان‌ها (${personTreatments.length})</h3>
                    ${personTreatments.length === 0 
                        ? '<p class="empty-section">درمانی ثبت نشده است</p>'
                        : personTreatments.map(t => {
                            const profitabilityLabel = profitabilityLabels[t.profitability] || t.profitability;
                            const costPart = t.cost ? `${Number(t.cost).toLocaleString('fa-IR')} تومان` : '';
                            return `
                                <div class="person-form-item">
                                    <div class="form-item-title">${t.name}</div>
                                    <div class="form-item-detail">سودآوری: ${profitabilityLabel}${costPart ? ` | هزینه: ${costPart}` : ''}</div>
                                    ${t.description ? `<div class="form-item-detail">${t.description}</div>` : ''}
                                    <div class="form-item-date">${t.createdAt}</div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>

                <div class="person-forms-section">
                    <h3>👨‍⚕️ پزشکان (${personDoctors.length})</h3>
                    ${personDoctors.length === 0 
                        ? '<p class="empty-section">پزشکی ثبت نشده است</p>'
                        : personDoctors.map(d => `
                            <div class="person-form-item">
                                <div class="form-item-title">${d.name}</div>
                                <div class="form-item-date">${d.createdAt}</div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// حذف شخص
function deletePerson(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این شخص را حذف کنید؟')) {
        persons = persons.filter(p => p.id !== id);
        savePersons();
        renderPersonList();
        showNotification('شخص حذف شد', 'info');
    }
}

// حذف پزشک
function deleteDoctor(id) {
    if (confirm('آیا مطمئن هستید که می‌خواهید این پزشک را حذف کنید؟')) {
        doctors = doctors.filter(d => d.id !== id);
        saveDoctors();
        renderDoctorList();
        showNotification('پزشک حذف شد', 'info');
    }
}

// ذخیره پرداخت‌ها
async function savePaymentTypes() {
    localStorage.setItem('paymentTypes', JSON.stringify(paymentTypes));
    // ذخیره در JSONBin.io (اگر تنظیم شده باشد)
    if (typeof saveToJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
        const allData = {
            persons: persons,
            paymentTypes: paymentTypes,
            treatments: treatments,
            doctors: doctors
        };
        await saveToJSONBin(allData);
    }
}

// ذخیره درمان‌ها
async function saveTreatments() {
    localStorage.setItem('treatments', JSON.stringify(treatments));
    // ذخیره در JSONBin.io (اگر تنظیم شده باشد)
    if (typeof saveToJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
        const allData = {
            persons: persons,
            paymentTypes: paymentTypes,
            treatments: treatments,
            doctors: doctors
        };
        await saveToJSONBin(allData);
    }
}

// ذخیره اشخاص
async function savePersons() {
    localStorage.setItem('persons', JSON.stringify(persons));
    // ذخیره در JSONBin.io (اگر تنظیم شده باشد)
    if (typeof saveToJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
        const allData = {
            persons: persons,
            paymentTypes: paymentTypes,
            treatments: treatments,
            doctors: doctors
        };
        await saveToJSONBin(allData);
    }
}

// ذخیره پزشکان
async function saveDoctors() {
    localStorage.setItem('doctors', JSON.stringify(doctors));
    // ذخیره در JSONBin.io (اگر تنظیم شده باشد)
    if (typeof saveToJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
        const allData = {
            persons: persons,
            paymentTypes: paymentTypes,
            treatments: treatments,
            doctors: doctors
        };
        await saveToJSONBin(allData);
    }
}

// بارگذاری داده‌ها از JSONBin.io (برای ادمین)
async function loadAllDataFromJSONBin() {
    if (typeof loadFromJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
        const data = await loadFromJSONBin();
        if (data) {
            persons = data.persons || [];
            paymentTypes = data.paymentTypes || [];
            treatments = data.treatments || [];
            doctors = data.doctors || [];
            
            // ذخیره در localStorage هم (برای fallback)
            localStorage.setItem('persons', JSON.stringify(persons));
            localStorage.setItem('paymentTypes', JSON.stringify(paymentTypes));
            localStorage.setItem('treatments', JSON.stringify(treatments));
            localStorage.setItem('doctors', JSON.stringify(doctors));
            
            return true;
        }
    }
    return false;
}

// نمایش نوتیفیکیشن
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    let bgColor, borderColor;
    if (type === 'success') {
        bgColor = '#28a745';
        borderColor = '#20c997';
    } else if (type === 'error') {
        bgColor = '#dc3545';
        borderColor = '#c82333';
    } else {
        bgColor = '#17a2b8';
        borderColor = '#138496';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, ${bgColor}, ${borderColor});
        color: white;
        padding: 18px 35px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 10000;
        animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 700;
        font-size: 1rem;
        border: 2px solid rgba(255,255,255,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// افزودن استایل‌های انیمیشن
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// رندر پنل ادمین
function renderAdminPanel() {
    // آمار کلی
    document.getElementById('personsCount').textContent = persons.length;
    document.getElementById('paymentsCount').textContent = paymentTypes.length;
    document.getElementById('treatmentsCount').textContent = treatments.length;
    document.getElementById('doctorsCount').textContent = doctors.length;

    // لیست اشخاص
    const adminPersonsList = document.getElementById('adminPersonsList');
    if (adminPersonsList) {
        if (persons.length === 0) {
            adminPersonsList.innerHTML = '<div class="empty-admin-message">هیچ شخصی ثبت نشده است</div>';
        } else {
            adminPersonsList.innerHTML = persons.map(p => `
                <div class="admin-item">
                    <div class="admin-item-title">${p.firstName} ${p.lastName}</div>
                    <div class="admin-item-detail">ثبت شده: ${p.createdAt}</div>
                </div>
            `).join('');
        }
    }

    // لیست پرداخت‌ها
    const adminPaymentsList = document.getElementById('adminPaymentsList');
    if (paymentTypes.length === 0) {
        adminPaymentsList.innerHTML = '<div class="empty-admin-message">هیچ پرداختی ثبت نشده است</div>';
    } else {
        const sortedPayments = [...paymentTypes].sort((a, b) => (b.score || 0) - (a.score || 0));
        adminPaymentsList.innerHTML = sortedPayments.map(p => `
            <div class="admin-item">
                <div class="admin-item-title">${p.type}</div>
                <div class="admin-item-detail">امتیاز: ${p.score}/10 ⭐</div>
                ${p.description ? `<div class="admin-item-detail">${p.description}</div>` : ''}
                <div class="admin-item-detail" style="font-size: 0.8rem; margin-top: 5px;">${p.createdAt}</div>
            </div>
        `).join('');
    }

    // لیست درمان‌ها
    const adminTreatmentsList = document.getElementById('adminTreatmentsList');
    if (treatments.length === 0) {
        adminTreatmentsList.innerHTML = '<div class="empty-admin-message">هیچ درمانی ثبت نشده است</div>';
    } else {
        const sortedTreatments = [...treatments].sort((a, b) => {
            return profitabilityOrder[a.profitability] - profitabilityOrder[b.profitability];
        });
        adminTreatmentsList.innerHTML = sortedTreatments.map(t => {
            const profitabilityLabel = profitabilityLabels[t.profitability] || t.profitability;
            const costPart = t.cost ? `${Number(t.cost).toLocaleString('fa-IR')} تومان` : '';
            return `
                <div class="admin-item">
                    <div class="admin-item-title">${t.name}</div>
                    <div class="admin-item-detail">سودآوری: ${profitabilityLabel}</div>
                    ${costPart ? `<div class="admin-item-detail">هزینه: ${costPart}</div>` : ''}
                    ${t.description ? `<div class="admin-item-detail">${t.description}</div>` : ''}
                    <div class="admin-item-detail" style="font-size: 0.8rem; margin-top: 5px;">${t.createdAt}</div>
                </div>
            `;
        }).join('');
    }

    // لیست پزشکان
    const adminDoctorsList = document.getElementById('adminDoctorsList');
    if (doctors.length === 0) {
        adminDoctorsList.innerHTML = '<div class="empty-admin-message">هیچ پزشکی ثبت نشده است</div>';
    } else {
        adminDoctorsList.innerHTML = doctors.map(d => `
            <div class="admin-item">
                <div class="admin-item-title">${d.name}</div>
                <div class="admin-item-detail">ثبت شده: ${d.createdAt}</div>
            </div>
        `).join('');
    }
}

// Export تمام داده‌ها (فقط برای ادمین)
function exportAllData() {
    if (!isAdmin) {
        showNotification('شما دسترسی ادمین ندارید!', 'info');
        return;
    }
    
    const allData = {
        exportDate: new Date().toLocaleString('fa-IR'),
        note: 'این داده‌ها از localStorage مرورگر شما استخراج شده‌اند',
        persons: persons,
        paymentTypes: paymentTypes,
        treatments: treatments,
        doctors: doctors
    };

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atiyeh-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('داده‌ها با موفقیت دانلود شدند!', 'success');
}

// پاک کردن تمام داده‌ها (فقط برای ادمین)
function clearAllData() {
    if (!isAdmin) {
        showNotification('شما دسترسی ادمین ندارید!', 'info');
        return;
    }
    
    if (confirm('⚠️ هشدار: آیا مطمئن هستید که می‌خواهید تمام داده‌ها را پاک کنید؟ این عمل قابل بازگشت نیست!')) {
        if (confirm('آیا واقعاً مطمئن هستید؟ تمام اطلاعات پاک خواهد شد!')) {
            persons = [];
            paymentTypes = [];
            treatments = [];
            doctors = [];
            
            savePersons();
            savePaymentTypes();
            saveTreatments();
            saveDoctors();
            
            renderPersonList();
            renderPaymentList();
            renderTreatmentList();
            renderDoctorList();
            renderAdminPanel();
            
            showNotification('تمام داده‌ها پاک شدند', 'info');
        }
    }
}

// خروج از پنل ادمین
function logoutAdmin() {
    if (confirm('آیا می‌خواهید از پنل ادمین خارج شوید؟')) {
        isAdmin = false;
        localStorage.removeItem('admin_authenticated');
        updateAdminVisibility();
        
        // بستن بخش ادمین و بازگشت به بخش اول
        document.querySelectorAll('.menu-category').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelector('.menu-category[data-section="person"]').classList.add('active');
        document.getElementById('person').classList.add('active');
        
        showNotification('از پنل ادمین خارج شدید', 'info');
    }
}

// Event Delegation برای دکمه‌های حذف
document.addEventListener('click', (e) => {
    // حذف شخص
    if (e.target.classList.contains('btn-delete-person')) {
        const personId = parseInt(e.target.getAttribute('data-person-id'));
        deletePerson(personId);
    }
    
    // حذف پرداخت
    if (e.target.classList.contains('btn-delete-payment')) {
        const paymentId = parseInt(e.target.getAttribute('data-payment-id'));
        deletePayment(paymentId);
    }
    
    // حذف درمان
    if (e.target.classList.contains('btn-delete-treatment')) {
        const treatmentId = parseInt(e.target.getAttribute('data-treatment-id'));
        deleteTreatment(treatmentId);
    }
    
    // حذف پزشک
    if (e.target.classList.contains('btn-delete-doctor')) {
        const doctorId = parseInt(e.target.getAttribute('data-doctor-id'));
        deleteDoctor(doctorId);
    }
    
    // مشاهده فرم‌های شخص
    if (e.target.classList.contains('btn-view')) {
        const personId = parseInt(e.target.getAttribute('data-person-id'));
        viewPersonForms(personId);
    }
    
    // بستن مودال
    if (e.target.classList.contains('modal-close')) {
        e.target.closest('.person-modal').remove();
    }
});

// Event Listener برای دکمه‌های ورود ادمین
document.addEventListener('DOMContentLoaded', () => {
    // دکمه ورود ادمین
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            const password = document.getElementById('adminPasswordInput').value;
            const errorEl = document.getElementById('adminLoginError');
            
            if (checkAdminPassword(password)) {
                isAdmin = true;
                localStorage.setItem('admin_authenticated', 'true');
                updateAdminVisibility();
                hideAdminLogin();
                
                // باز کردن بخش ادمین
                document.querySelectorAll('.menu-category').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                const adminMenu = document.querySelector('.admin-menu');
                if (adminMenu) {
                    adminMenu.classList.add('active');
                }
                const adminSection = document.getElementById('admin');
                if (adminSection) {
                    adminSection.classList.add('active');
                }
                
                // بارگذاری داده‌ها از JSONBin.io
                if (typeof loadAllDataFromJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
                    loadAllDataFromJSONBin().then(loaded => {
                        if (loaded) {
                            renderPersonList();
                            renderPaymentList();
                            renderTreatmentList();
                            renderDoctorList();
                        }
                        renderAdminPanel();
                        showNotification('با موفقیت وارد پنل ادمین شدید!', 'success');
                    });
                } else {
                    renderAdminPanel();
                    showNotification('با موفقیت وارد پنل ادمین شدید!', 'success');
                }
            } else {
                if (errorEl) {
                    errorEl.textContent = 'رمز عبور اشتباه است!';
                }
            }
        });
    }
    
    // دکمه انصراف
    const adminCancelBtn = document.getElementById('adminCancelBtn');
    if (adminCancelBtn) {
        adminCancelBtn.addEventListener('click', () => {
            hideAdminLogin();
        });
    }
    
    // بستن مودال با کلیک روی پس‌زمینه
    const adminLoginModal = document.getElementById('adminLoginModal');
    if (adminLoginModal) {
        adminLoginModal.addEventListener('click', (e) => {
            if (e.target === adminLoginModal) {
                hideAdminLogin();
            }
        });
    }
    
    // ورود با Enter
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (adminLoginBtn) {
                    adminLoginBtn.click();
                }
            }
        });
    }
});

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', async () => {
    // کاربر فعلی null است - باید ثبت نام کند
    currentUser = null;
    // پاک کردن currentUser از localStorage (برای اطمینان از اینکه نامی نمایش داده نشود)
    localStorage.removeItem('currentUser');
    
    // اگر ادمین است، داده‌ها را از JSONBin.io بارگذاری کن
    if (isAdmin && typeof loadAllDataFromJSONBin === 'function' && JSONBIN_API_KEY && JSONBIN_BIN_ID) {
        await loadAllDataFromJSONBin();
    }
    
    // به‌روزرسانی نمایش بخش ادمین
    updateAdminVisibility();
    
    setTimeout(() => {
        updateCurrentUserDisplay();
        renderPersonList();
        renderPaymentList();
        renderTreatmentList();
        renderDoctorList();
        if (isAdmin) {
            renderAdminPanel();
        }
    }, 2600);
});

// رندر مجدد پنل ادمین هنگام تغییر بخش (این کار در event listener بالا انجام می‌شود)
