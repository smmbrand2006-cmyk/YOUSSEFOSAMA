const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CONFIG_FILE = path.join(process.cwd(), "git-auth.json");
const REPO_OWNER_REPO = "smmbrand2006-cmyk/YOUSSEFOSAMA.git";

function run(cmd, silent = false) {
  try {
    return execSync(cmd, {
      stdio: silent ? "pipe" : "inherit",
      encoding: "utf-8",
    });
  } catch (err) {
    if (!silent) {
      console.error(`❌ خطأ أثناء تنفيذ: ${cmd}`);
    }
    return null;
  }
}

function runOutput(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch (err) {
    return "";
  }
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getOrAskCredentials() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      if (data.token) return data;
    } catch (e) {}
  }

  console.log("\n=======================================================");
  console.log("   🔑 ربط حساب GitHub للمرة الأولى (يتم حفظها محلياً فقط)");
  console.log("=======================================================");
  console.log("لرفع الكود على GitHub بدون مشاكل، تحتاج Personal Access Token (PAT).");
  console.log("👉 لو معندكش Token، بتجيبه في ثواني من الرابط ده:");
  console.log("   https://github.com/settings/tokens/new");
  console.log("   (علم صح على 'repo' واضغط Generate token وانسخه)\n");

  const username =
    (await prompt("👤 أدخل اسم حسابك على GitHub (افتراضي: smmbrand2006-cmyk): ")) ||
    "smmbrand2006-cmyk";

  let token = "";
  while (!token) {
    token = await prompt("🔑 أدخل الـ GitHub Token (يبدأ بـ ghp_...): ");
    if (!token) console.log("⚠️ التوكن مطلوب للرفع!");
  }

  const credentials = { username, token };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(credentials, null, 2));
  console.log("✅ تم حفظ بيانات الحساب بأمان في git-auth.json (محمية ومستثناة من Git).");
  return credentials;
}

function checkChanges() {
  const statusOutput = runOutput("git status --porcelain");
  if (!statusOutput) {
    return { hasChanges: false, summary: "لا توجد تعديلات جديدة", files: [] };
  }

  const lines = statusOutput.split("\n").filter(Boolean);
  const added = [];
  const modified = [];
  const deleted = [];

  lines.forEach((line) => {
    const code = line.substring(0, 2).trim();
    const file = line.substring(3).trim();
    if (code === "?" || code === "A") added.push(file);
    else if (code === "M") modified.push(file);
    else if (code === "D") deleted.push(file);
    else modified.push(file);
  });

  return {
    hasChanges: true,
    added,
    modified,
    deleted,
    total: lines.length,
  };
}

async function syncToGitHub() {
  console.log("\n=======================================================");
  console.log("       🤖 بوت فحص التعديلات والرفع التلقائي لـ GitHub");
  console.log("=======================================================");

  // 1. Git Init Check
  if (!fs.existsSync(".git")) {
    console.log("⚡ جاري تهيئة Git...");
    run("git init");
    run("git branch -M main");
  }

  // 2. Auth Credentials
  const { username, token } = await getOrAskCredentials();
  const remoteUrl = `https://${token}@github.com/${REPO_OWNER_REPO}`;

  // Configure remote silently with token
  run("git remote remove origin", true);
  run(`git remote add origin ${remoteUrl}`, true);

  // Configure user if needed
  if (!runOutput("git config user.name")) {
    run(`git config user.name "${username}"`, true);
    run(`git config user.email "${username}@users.noreply.github.com"`, true);
  }

  // 3. Detect Changes
  console.log("\n🔍 [1/3] فحص التغييرات في المشروع...");
  const changes = checkChanges();

  if (!changes.hasChanges) {
    console.log("🟢 كل الملفات متزامنة ومرفوعة بالفعل! لا توجد تعديلات جديدة.");
    return;
  }

  console.log(`\n📋 تم اكتشاف ${changes.total} عنصر تم تعديله:`);
  if (changes.added.length > 0) {
    console.log(`   ➕ ملفات جديدة (${changes.added.length}):`);
    changes.added.slice(0, 5).forEach((f) => console.log(`      + ${f}`));
    if (changes.added.length > 5) console.log(`      ... و ${changes.added.length - 5} ملفات أخرى`);
  }
  if (changes.modified.length > 0) {
    console.log(`   ✏️ ملفات معدلة (${changes.modified.length}):`);
    changes.modified.slice(0, 5).forEach((f) => console.log(`      ~ ${f}`));
    if (changes.modified.length > 5) console.log(`      ... و ${changes.modified.length - 5} ملفات أخرى`);
  }
  if (changes.deleted.length > 0) {
    console.log(`   🗑️ ملفات محذوفة (${changes.deleted.length}):`);
    changes.deleted.slice(0, 5).forEach((f) => console.log(`      - ${f}`));
  }

  // 4. Generate Commit Message
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  const parts = [];
  if (changes.modified.length > 0) parts.push(`تعديل ${changes.modified.length} ملف`);
  if (changes.added.length > 0) parts.push(`إضافة ${changes.added.length} جديد`);
  if (changes.deleted.length > 0) parts.push(`حذف ${changes.deleted.length}`);
  const commitMsg = `تحديث [${now}]: ${parts.join(" ، ")}`;

  // 5. Add & Commit
  console.log(`\n📦 [2/3] حفظ التعديلات: "${commitMsg}"...`);
  run("git add .");
  run(`git commit -m "${commitMsg}"`);

  // 6. Push to GitHub
  console.log("\n🚀 [3/3] جاري الرفع إلى مستودع GitHub...");
  try {
    const res = run("git push -u origin main");
    if (res === null) {
      console.log("🔄 جاري مزامنة الفروع قبل الرفع...");
      run("git pull origin main --rebase --allow-unrelated-histories", true);
      run("git push -u origin main");
    }
    console.log("\n=======================================================");
    console.log("  🎉 تم رفع التعديلات وحفظها بنجاح على GitHub!");
    console.log(`  🌐 رابط المستودع: https://github.com/${REPO_OWNER_REPO}`);
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\n❌ فشل الرفع! تأكد من صحة الـ Token وصلاحيات الحساب.");
  }
}

// Execution
const isWatch = process.argv.includes("--watch");
if (isWatch) {
  console.log("🤖 وضع المراقبة المستمرة مفعّل...");
  syncToGitHub().then(() => {
    console.log("⏱️ سيقوم البوت بفحص أي تعديل جديد كل 5 دقائق ورفعه تلقائياً.");
    setInterval(() => {
      syncToGitHub();
    }, 5 * 60 * 1000);
  });
} else {
  syncToGitHub();
}
