const { execSync } = require("child_process");

const REPO_URL = "https://github.com/smmbrand2006-cmyk/YOUSSEFOSAMA.git";

function runCommand(command) {
  try {
    return execSync(command, { stdio: "inherit", encoding: "utf-8" });
  } catch (err) {
    return null;
  }
}

function initGitIfNeeded() {
  const fs = require("fs");
  if (!fs.existsSync(".git")) {
    console.log("⚡ تهيئة Git وربط المستودع لأول مرة...");
    runCommand("git init");
    runCommand("git branch -M main");
    runCommand(`git remote add origin ${REPO_URL}`);
  }
}

function saveAndPush(customMessage) {
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  const message = customMessage || `حفظ تلقائي للنسخة: ${now}`;

  console.log("\n📦 [1/3] فحص الملفات وإضافتها...");
  initGitIfNeeded();
  runCommand("git add .");

  console.log(`💾 [2/3] حفظ التغييرات: "${message}"...`);
  runCommand(`git commit -m "${message}"`);

  console.log("🚀 [3/3] رفع التحديثات إلى GitHub...");
  try {
    runCommand("git push -u origin main");
    console.log("\n✅ تم الحفظ والرفع إلى GitHub بنجاح! 🌟");
    console.log(`🔗 الرابط: ${REPO_URL}`);
  } catch (e) {
    console.error("⚠️ حدث خطأ أثناء الرفع، تأكد من اتصال الإنترنت وصلاحية حسابك على GitHub.");
  }
}

// Check arguments
const args = process.argv.slice(2);
if (args.includes("--watch")) {
  console.log("🤖 تم تشغيل بوت المراقبة والحفظ التلقائي في الخلفية...");
  console.log("⏱️ سيتم فحص ورفع أي تغييرات كل 10 دقائق تلقائياً.");
  // Run once immediately
  saveAndPush("بدء تشغيل بوت المراقبة التلقائي");
  // Repeat every 10 minutes (600,000 ms)
  setInterval(() => {
    saveAndPush("حفظ دوري تلقائي من البوت");
  }, 10 * 60 * 1000);
} else {
  // One-time save
  const customMsg = args.length > 0 ? args.join(" ") : null;
  saveAndPush(customMsg);
}
