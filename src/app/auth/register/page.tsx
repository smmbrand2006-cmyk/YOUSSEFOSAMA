"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithCode, signInWithGoogle } from "@/lib/firebase/auth";
import { updateUserProfile } from "@/lib/firebase/firestore";
import { User as LucideUser, Hash, MessageCircle, Shield, Zap, Check } from "lucide-react";
import styles from "@/styles/auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "profile">("code");
  const [userCode, setUserCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUid, setCreatedUid] = useState("");

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

    setLoading(true);
    try {
      const user = await registerWithCode(userCode.trim(), "New User");
      setCreatedUid(user.uid);
      if (typeof window !== "undefined") {
        localStorage.setItem("youssef_app_uid", user.uid);
        localStorage.setItem("youssef_app_code", userCode.trim());
      }
      setStep("profile");
    } catch (err: any) {
      setError(err.message || "فشل إنشاء الحساب.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("يرجى إدخال اسمك.");
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(createdUid, {
        displayName: displayName.trim(),
      });

      router.replace("/chat");
    } catch (err: any) {
      setError(err.message || "فشل إعداد الحساب.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace("/chat");
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول بـ Google.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name.trim()) return "#";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authLeft}>
        <div className={styles.authCard}>
          <div className={styles.authLogo}>
            <div className={styles.authLogoIcon}>
              <MessageCircle size={28} />
            </div>
            <h1>Youssef App</h1>
          </div>

          {step === "code" ? (
            <>
              <h2 className={styles.authTitle}>إنشاء حساب جديد</h2>
              <p className={styles.authSubtitle}>
                اختر كوداً أو رقماً فريداً للتعريف بحسابك — بدون رقم هاتف حقيقي وبدون SMS
              </p>

              <form className={styles.authForm} onSubmit={handleRegister}>
                {error && <div className={styles.authError}>{error}</div>}

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

                <button
                  type="submit"
                  className={styles.authSubmit}
                  disabled={loading}
                >
                  {loading ? "جاري الإنشاء..." : "متابعة"}
                </button>
              </form>

              <div className={styles.authDivider}>أو</div>

              <button
                className={styles.googleBtn}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className={styles.googleLogo} viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                المتابعة بحساب Google
              </button>

              <p className={styles.authSwitch}>
                لديك حساب بالفعل؟{" "}
                <a onClick={() => router.push("/auth/login")}>تسجيل الدخول</a>
              </p>
            </>
          ) : (
            <>
              <h2 className={styles.authTitle}>إكمال بيانات الحساب</h2>
              <p className={styles.authSubtitle}>
                أدخل اسمك ليظهر لأصدقائك عند المحادثة
              </p>

              <form className={styles.authForm} onSubmit={handleProfileSetup}>
                {error && <div className={styles.authError}>{error}</div>}

                {/* Avatar with Initials Preview */}
                <div className={styles.avatarUpload}>
                  <div
                    className={styles.avatarUploadCircle}
                    style={{
                      background: "var(--primary-gradient)",
                      color: "white",
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getInitials(displayName || userCode)}
                  </div>
                  <span className={styles.avatarUploadLabel} style={{ color: "var(--primary)", fontWeight: 600 }}>
                    كود حسابك: #{userCode}
                  </span>
                </div>

                <div className={styles.authInput}>
                  <input
                    type="text"
                    placeholder="الاسم الذي يظهر للآخرين (مثال: يوسف أحمد)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoFocus
                  />
                  <LucideUser size={18} className={styles.authInputIcon} />
                </div>

                <button
                  type="submit"
                  className={styles.authSubmit}
                  disabled={loading}
                >
                  {loading ? "جاري الحفظ..." : "بدء المحادثة ←"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authRightContent}>
          <h2>مرحباً بك في<br />Youssef App</h2>
          <p>
            تطبيق مراسلة فوري وآمن يعتمد على كود تعريفي خاص بك، بدون الحاجة لمساحات تخزين سحابية أو تعقيدات.
          </p>
          <div className={styles.authRightFeatures}>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>💬</div>
              <span>محادثات فورية مشفرة وسريعة</span>
            </div>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>📞</div>
              <span>مكالمات صوت وفيديو P2P عبر WebRTC</span>
            </div>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>🔢</div>
              <span>تسجيل مباشر برقمك أو كودك الفريد</span>
            </div>
            <div className={styles.authFeature}>
              <div className={styles.authFeatureIcon}>⚡</div>
              <span>خفيف وسريع بدون استهلاك تخزين</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
