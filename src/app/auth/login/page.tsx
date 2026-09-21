"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithCode } from "@/lib/firebase/auth";
import { Hash, Lock, ShieldAlert } from "lucide-react";
import Image from "next/image";
import styles from "@/styles/auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [userCode, setUserCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userCode.trim()) {
      setError("يرجى إدخال الكود أو الرقم الخاص بك.");
      return;
    }
    if (!password) {
      setError("يرجى إدخال كلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      await loginWithCode(userCode.trim(), password);
      router.replace("/chat");
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول.");
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

          <h2 className={styles.authTitle}>تسجيل الدخول</h2>
          <p className={styles.authSubtitle}>
            أدخل كودك الخاص وكلمة المرور للدخول إلى محادثاتك
          </p>

          {/* Direct Android APK Download Banner */}
          <a
            href="https://github.com/smmbrand2006-cmyk/YOUSSEFOSAMA/releases/latest/download/YOUSSEF_APP.apk"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              marginBottom: "18px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, rgba(18, 140, 126, 0.08) 100%)",
              border: "1px solid rgba(37, 211, 102, 0.35)",
              textDecoration: "none",
              transition: "transform 0.15s ease, border-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(37, 211, 102, 0.3)",
                }}
              >
                <span className="material-symbols-outlined" style={{ color: "#fff", fontSize: "20px" }}>
                  android
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#FFFFFF" }}>
                  تحميل تطبيق الأندرويد الرسمي
                </div>
                <div style={{ fontSize: "11px", color: "#25D366" }}>
                  تنزيل مباشر وسريع (APK) • بدون متصفح
                </div>
              </div>
            </div>
            <div
              style={{
                background: "#25D366",
                color: "#0B0E14",
                fontWeight: "700",
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>تحميل</span>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                download
              </span>
            </div>
          </a>

          <form className={styles.authForm} onSubmit={handleLogin}>
            {error && <div className={styles.authError}>{error}</div>}

            <div className={styles.authInput}>
              <input
                type="text"
                placeholder="كودك أو رقمك (مثال: 010999)"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                autoFocus
              />
              <Hash size={18} className={styles.authInputIcon} />
            </div>

            <div className={styles.authInput}>
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={18} className={styles.authInputIcon} />
            </div>

            <button
              type="submit"
              className={styles.authSubmit}
              disabled={loading}
            >
              {loading ? "جاري التحقق والدخول..." : "تسجيل الدخول ←"}
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <ShieldAlert size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              🔒 تنبيه: لا توجد ميزة استعادة لكلمة المرور — تأكد من صحة الكود وكلمة المرور للدخول.
            </span>
          </div>

          <p className={styles.authSwitch}>
            ليس لديك حساب بعد؟{" "}
            <a onClick={() => router.push("/auth/register")}>إنشاء حساب جديد</a>
          </p>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightContent}>
          <h2>مرحباً بك في<br />YOUSSEF APP</h2>
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
