"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithCode } from "@/lib/firebase/auth";
import { User as LucideUser, Hash, Lock, AlertTriangle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import styles from "@/styles/auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [userCode, setUserCode] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreedToSecurity, setAgreedToSecurity] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userCode.trim()) {
      setError("يرجى إدخال الكود أو الرقم الخاص بك.");
      return;
    }
    if (userCode.trim().length < 3) {
      setError("الكود يجب أن يكون 3 أحرف أو أرقام على الأقل.");
      return;
    }
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 خانات أو أكثر.");
      return;
    }
    if (!displayName.trim()) {
      setError("يرجى إدخال اسمك.");
      return;
    }
    if (!agreedToSecurity) {
      setError("يجب تأكيد إقرارك بحفظ كلمة المرور في مكان آمن وعدم إمكانية استرجاعها للمتابعة.");
      return;
    }

    setLoading(true);
    try {
      await registerWithCode(userCode.trim(), password, displayName.trim());
      router.replace("/chat");
    } catch (err: any) {
      setError(err.message || "فشل إنشاء الحساب.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authLeft}>
        <div className={styles.authCard}>
          <div className={styles.authLogo} style={{ justifyContent: "center", marginBottom: "16px" }}>
            <Image
              src="/logo.png"
              alt="YOUSSEF APP"
              width={190}
              height={60}
              priority
              style={{
                objectFit: "contain",
                height: "50px",
                width: "auto",
                filter: "drop-shadow(0 3px 12px rgba(255, 255, 255, 0.15))",
              }}
            />
          </div>

          <h2 className={styles.authTitle}>إنشاء حساب جديد</h2>
          <p className={styles.authSubtitle}>
            سجل بكودك أو رقمك الخاص مع كلمة مرور لحماية حسابك
          </p>

          <form className={styles.authForm} onSubmit={handleRegister}>
            {error && <div className={styles.authError}>{error}</div>}

            {/* الكود أو الرقم */}
            <div className={styles.authInput}>
              <input
                type="text"
                placeholder="كودك أو رقمك (مثال: 010999 أو 7788)"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                autoFocus
              />
              <Hash size={18} className={styles.authInputIcon} />
            </div>

            {/* كلمة المرور */}
            <div className={styles.authInput}>
              <input
                type="password"
                placeholder="كلمة المرور (6 خانات على الأقل)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={18} className={styles.authInputIcon} />
            </div>

            {/* الاسم */}
            <div className={styles.authInput}>
              <input
                type="text"
                placeholder="الاسم المستعار (مثال: يوسف أحمد)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <LucideUser size={18} className={styles.authInputIcon} />
            </div>

            {/* تنويه أمني وإخلاء مسؤولية صريح */}
            <div className={styles.securityNotice}>
              <div className={styles.securityNoticeHeader}>
                <AlertTriangle size={15} />
                <span>تنبيه أمني هام وإخلاء مسؤولية</span>
              </div>
              <ul className={styles.securityNoticeList}>
                <li className={styles.securityNoticeItem}>
                  <span><strong>حفظ كلمة المرور:</strong> احتفظ بكلمة المرور في مكان آمن وخاص بك تماماً.</span>
                </li>
                <li className={styles.securityNoticeItem}>
                  <span><strong>إخلاء مسؤولية:</strong> إدارة التطبيق غير مسؤولة عن تسريب أو ضياع كلمة المرور.</span>
                </li>
                <li className={styles.securityNoticeItem}>
                  <span><strong>لا يوجد استرجاع:</strong> لا يمكن إعادة تعيين أو استرجاع كلمة المرور في حال فقدانها نهائياً.</span>
                </li>
              </ul>
            </div>

            {/* إقرار المستخدم بالموافقة */}
            <label className={styles.securityCheckboxLabel}>
              <input
                type="checkbox"
                checked={agreedToSecurity}
                onChange={(e) => setAgreedToSecurity(e.target.checked)}
              />
              <span>
                أقر بأنني <strong>حفظت كلمة المرور</strong> وأتحمل المسؤولية، وأعلم أنه <strong>لا يمكن استرجاعها نهائياً</strong>.
              </span>
            </label>

            <button
              type="submit"
              className={styles.authSubmit}
              disabled={loading}
            >
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب وبدء الشات ←"}
            </button>
          </form>

          <p className={styles.authSwitch}>
            لديك حساب بالفعل؟{" "}
            <a onClick={() => router.push("/auth/login")}>تسجيل الدخول</a>
          </p>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightContent}>
          <h2>مرحباً بك في<br />Youssef App</h2>
          <p>
            تطبيق مراسلة فوري وآمن يعتمد على كود تعريفي خاص بك مع كلمة سر، بدون الحاجة لمساحات تخزين سحابية أو تعقيدات.
          </p>
          <div className={styles.authRightFeatures}>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>🔒</div>
              <span>حماية كاملة بكلمة مرور خاصة بك</span>
            </div>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>💬</div>
              <span>محادثات فورية مباشرة</span>
            </div>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>📞</div>
              <span>مكالمات صوت وفيديو P2P عبر WebRTC</span>
            </div>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>⚡</div>
              <span>سريع وخفيف بدون تخزين صور خارجي</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
