# 📦 راهنمای Deploy پروژه "فرم آتیه" در Vercel

## روش 1: Deploy از طریق وب‌سایت Vercel (پیشنهادی) 🚀

### مرحله 1: آپلود به GitHub

1. **ساخت Repository جدید در GitHub:**
   - به https://github.com بروید و وارد شوید
   - روی **"+"** → **"New repository"** کلیک کنید
   - نام Repository: `form-atiyeh`
   - Public یا Private انتخاب کنید
   - **Initialize with README را تیک نزنید**
   - روی **"Create repository"** کلیک کنید

2. **آپلود پروژه به GitHub:**
   
   در PowerShell یا Command Prompt این دستورات را اجرا کنید:
   
   ```bash
   cd "C:\Users\USER\Desktop\فرم آتیه"
   git init
   git add .
   git commit -m "Initial commit - فرم آتیه"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/form-atiyeh.git
   git push -u origin main
   ```
   
   ⚠️ **توجه**: `YOUR_USERNAME` را با نام کاربری GitHub خود جایگزین کنید

### مرحله 2: Deploy در Vercel

1. به **https://vercel.com** بروید
2. روی **"Sign Up"** یا **"Log In"** کلیک کنید
3. با **GitHub** خود وارد شوید (Sign in with GitHub)
4. در Dashboard، روی **"Add New..."** → **"Project"** کلیک کنید
5. Repository `form-atiyeh` را پیدا کرده و روی **"Import"** کلیک کنید
6. تنظیمات پروژه:
   - **Project Name**: `form-atiyeh`
   - **Framework Preset**: Other (یا Vite را انتخاب کنید)
   - **Root Directory**: `./`
   - **Build Command**: خالی بگذارید
   - **Output Directory**: `.`
7. روی **"Deploy"** کلیک کنید
8. ✅ **تمام!** بعد از چند ثانیه، آدرس شما آماده است (مثل: `form-atiyeh.vercel.app`)

---

## روش 2: Deploy از طریق Vercel CLI 💻

### نصب Vercel CLI:

```bash
npm install -g vercel
```

### اجرای Deploy:

```bash
cd "C:\Users\USER\Desktop\فرم آتیه"
vercel
```

به سوالات پاسخ دهید:
- **Set up and deploy?** → `Y`
- **Which scope?** → حساب خود را انتخاب کنید
- **Link to existing project?** → `N`
- **What's your project's name?** → `form-atiyeh`
- **In which directory is your code located?** → `./`

✅ **تمام!** آدرس شما آماده است

---

## ⚙️ تنظیمات مهم قبل از Deploy

### 1. رمز عبور ادمین
فایل `config.js` را بررسی کنید:
```javascript
const ADMIN_PASSWORD = 'nima1986'; // رمز عبور فعلی
```

### 2. JSONBin.io (اختیاری)
اگر می‌خواهید داده‌ها را در JSONBin.io ذخیره کنید:
```javascript
const JSONBIN_API_KEY = ''; // API Key خود را وارد کنید
const JSONBIN_BIN_ID = '';  // Bin ID خود را وارد کنید
```

⚠️ **توجه**: این اطلاعات در کد JavaScript قرار می‌گیرند. برای امنیت بیشتر می‌توانید از Environment Variables در Vercel استفاده کنید.

---

## ✅ بعد از Deploy

- ✅ سایت شما در آدرس `https://form-atiyeh.vercel.app` در دسترس است
- ✅ می‌توانید لینک را با دیگران به اشتراک بگذارید
- ✅ هر تغییر در کد و push به GitHub، به صورت خودکار deploy می‌شود

---

## 🔄 به‌روزرسانی پروژه

بعد از هر تغییر در کد:

```bash
git add .
git commit -m "Update description"
git push
```

Vercel به صورت خودکار deploy می‌کند.

---

**موفق باشید! 🎉**

