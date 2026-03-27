"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { type User } from "@supabase/supabase-js";

import { AuthGuard } from "@/components/auth/auth-guard";
import { fetchRoleForCurrentUser, type AppRole } from "@/lib/client-role";
import { supabase } from "@/lib/supabase-client";

type RequestStatus = "pending" | "approved" | "rejected" | "none";

type StoredRequest = {
  id: number;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  admin_note: string | null;
} | null;

const MAX_DOC_SIZE_MB = 10;

function getFileExt(file: File): string {
  const name = file.name.toLowerCase();
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex > -1 && dotIndex < name.length - 1) {
    return name.slice(dotIndex + 1);
  }

  const mimeParts = file.type.toLowerCase().split("/");
  return mimeParts.length > 1 ? mimeParts[1] : "jpg";
}

export default function SellerApplyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("none");
  const [lastRequest, setLastRequest] = useState<StoredRequest>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const [passportPreview, setPassportPreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      if (passportPreview) URL.revokeObjectURL(passportPreview);
    };
  }, [selfiePreview, passportPreview]);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const profileRole = await fetchRoleForCurrentUser(supabase);

      if (!isMounted) return;

      if (!profileRole) {
        return;
      }

      setRole(profileRole);
    }

    async function loadState() {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData.user ?? null;

      if (!isMounted) return;

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      loadRole();

      const { data: requestData } = await supabase
        .from("seller_verification_requests")
        .select("id,status,submitted_at,admin_note")
        .eq("user_id", currentUser.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (requestData) {
        setLastRequest(requestData);
        setRequestStatus(requestData.status);
      } else {
        setLastRequest(null);
        setRequestStatus("none");
      }

      setIsLoading(false);
    }

    loadState();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    target: "selfie" | "passport"
  ) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    setError("");
    setSuccess("");

    if (!selected.type.startsWith("image/")) {
      setError("Please upload image files only.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      setError(`Each image must be ${MAX_DOC_SIZE_MB}MB or less.`);
      event.target.value = "";
      return;
    }

    if (target === "selfie") {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfieFile(selected);
      setSelfiePreview(URL.createObjectURL(selected));
    } else {
      if (passportPreview) URL.revokeObjectURL(passportPreview);
      setPassportFile(selected);
      setPassportPreview(URL.createObjectURL(selected));
    }

    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Please log in first.");
      return;
    }

    if (!selfieFile || !passportFile) {
      setError("Please upload both images: selfie and passport.");
      return;
    }

    if (requestStatus === "pending") {
      setError("You already have a pending request.");
      return;
    }

    setIsSubmitting(true);

    const stamp = Date.now();
    const selfieExt = getFileExt(selfieFile);
    const passportExt = getFileExt(passportFile);
    const selfiePath = `${user.id}/seller-request/${stamp}-selfie.${selfieExt}`;
    const passportPath = `${user.id}/seller-request/${stamp}-passport.${passportExt}`;

    const selfieUpload = await supabase.storage.from("kyc-docs").upload(selfiePath, selfieFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: selfieFile.type,
    });

    if (selfieUpload.error) {
      setIsSubmitting(false);
      setError(`Selfie upload failed: ${selfieUpload.error.message}`);
      return;
    }

    const passportUpload = await supabase.storage
      .from("kyc-docs")
      .upload(passportPath, passportFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: passportFile.type,
      });

    if (passportUpload.error) {
      setIsSubmitting(false);
      setError(`Passport upload failed: ${passportUpload.error.message}`);
      return;
    }

    const { data: insertData, error: insertError } = await supabase
      .from("seller_verification_requests")
      .insert({
        user_id: user.id,
        selfie_path: selfiePath,
        passport_path: passportPath,
        status: "pending",
      })
      .select("id,status,submitted_at,admin_note")
      .single();

    setIsSubmitting(false);

    if (insertError) {
      setError(`Request submit failed: ${insertError.message}`);
      return;
    }

    setLastRequest(insertData);
    setRequestStatus("pending");
    setSuccess("Submitted successfully. Verification will be completed within 24 hours.");
  }

  const requestStatusText = useMemo(() => {
    if (!role) return "Loading your account status...";
    if (role === "seller") return "You are already a verified seller.";
    if (requestStatus === "pending") return "Your seller request is pending review.";
    if (requestStatus === "approved") return "Your seller request was approved.";
    if (requestStatus === "rejected") return "Your request was rejected. You can resubmit.";
    return "Submit your selfie and passport image to apply as a seller.";
  }, [requestStatus, role]);

  return (
    <AuthGuard>
      <main className="auth-page">
        <div className="shell">
          <section className="auth-card seller-apply-card">
            <h1>Join Sellers</h1>
            <p>{requestStatusText}</p>

            {lastRequest ? (
              <div className={`request-status request-status--${lastRequest.status}`}>
                <strong>Status: {lastRequest.status}</strong>
                <span>Submitted: {new Date(lastRequest.submitted_at).toLocaleString()}</span>
                {lastRequest.admin_note ? <span>Note: {lastRequest.admin_note}</span> : null}
              </div>
            ) : null}

            {role === "seller" ? (
              <p className="auth-feedback auth-feedback--success">
                Your account is already a seller account.
              </p>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label htmlFor="seller-selfie">Selfie photo</label>
                <input
                  id="seller-selfie"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event, "selfie")}
                  disabled={isLoading || isSubmitting || requestStatus === "pending"}
                />

                <label htmlFor="seller-passport">Passport photo</label>
                <input
                  id="seller-passport"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event, "passport")}
                  disabled={isLoading || isSubmitting || requestStatus === "pending"}
                />

                <p className="account-hint">
                  Images are private and used only for verification. Max size: {MAX_DOC_SIZE_MB}MB each.
                </p>

                <div className="kyc-preview-grid">
                  <div className="kyc-preview-card">
                    <strong>Selfie Preview</strong>
                    {selfiePreview ? (
                      <img src={selfiePreview} alt="Selfie preview" />
                    ) : (
                      <span>No selfie selected</span>
                    )}
                  </div>
                  <div className="kyc-preview-card">
                    <strong>Passport Preview</strong>
                    {passportPreview ? (
                      <img src={passportPreview} alt="Passport preview" />
                    ) : (
                      <span>No passport selected</span>
                    )}
                  </div>
                </div>

                {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
                {success ? <p className="auth-feedback auth-feedback--success">{success}</p> : null}

                <button
                  className="primary-button auth-submit"
                  type="submit"
                  disabled={
                    isLoading ||
                    !role ||
                    isSubmitting ||
                    requestStatus === "pending"
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit Verification"}
                </button>
              </form>
            )}

            <p className="auth-switch">
              Back to <Link href="/account">Account</Link>
            </p>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
