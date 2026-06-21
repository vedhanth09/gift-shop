"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

interface AddressForm {
  label: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY_ADDRESS: AddressForm = {
  label: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  isDefault: false,
};

const MAX_ADDRESSES = 5;

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-taupe-muted focus:border-midnight focus:outline-none focus:ring-1 focus:ring-midnight";

/**
 * Customer account settings (PRD §Phase 5): update name/email, change password,
 * and manage up to five saved addresses. Form feedback uses the global toaster.
 */
export default function AccountSettings({
  name: initialName,
  email: initialEmail,
  addresses: initialAddresses,
}: {
  name: string;
  email: string;
  addresses: AddressForm[];
}) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const authUser = useAuthStore((s) => s.user);

  // Profile
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profileBusy, setProfileBusy] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<AddressForm[]>(initialAddresses);
  const [addrBusy, setAddrBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not update your profile.");
        return;
      }
      if (authUser) setUser({ ...authUser, name: data.user.name, email: data.user.email });
      toast.success("Profile updated.");
      router.refresh();
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not change your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      toast.success("Password updated.");
    } finally {
      setPwBusy(false);
    }
  }

  function updateAddress(index: number, patch: Partial<AddressForm>) {
    setAddresses((list) =>
      list.map((a, i) => (i === index ? { ...a, ...patch } : a))
    );
  }

  function setDefault(index: number) {
    setAddresses((list) => list.map((a, i) => ({ ...a, isDefault: i === index })));
  }

  function addAddress() {
    setAddresses((list) =>
      list.length >= MAX_ADDRESSES
        ? list
        : [...list, { ...EMPTY_ADDRESS, isDefault: list.length === 0 }]
    );
  }

  function removeAddress(index: number) {
    setAddresses((list) => {
      const next = list.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((a) => a.isDefault)) next[0].isDefault = true;
      return next;
    });
  }

  async function saveAddresses() {
    setAddrBusy(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not save your addresses.");
        return;
      }
      setAddresses(data.addresses);
      toast.success("Addresses saved.");
      router.refresh();
    } finally {
      setAddrBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Profile */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
          Profile
        </h2>
        <form
          onSubmit={saveProfile}
          className="space-y-4 rounded-xl border border-line-subtle bg-surface p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-taupe">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-taupe">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={profileBusy}
            className="rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
          >
            {profileBusy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      {/* Password */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-taupe">
          Password
        </h2>
        <form
          onSubmit={savePassword}
          className="space-y-4 rounded-xl border border-line-subtle bg-surface p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-taupe">Current password</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-taupe">New password</span>
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-taupe">Confirm new password</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={pwBusy}
            className="rounded-lg bg-midnight px-5 py-2.5 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
          >
            {pwBusy ? "Updating…" : "Change password"}
          </button>
        </form>
      </section>

      {/* Addresses */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-taupe">
            Saved addresses
          </h2>
          <span className="text-xs text-taupe-muted">
            {addresses.length}/{MAX_ADDRESSES}
          </span>
        </div>

        <div className="space-y-4">
          {addresses.length === 0 && (
            <p className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-taupe">
              No saved addresses yet.
            </p>
          )}

          {addresses.map((addr, i) => (
            <div key={i} className="rounded-xl border border-line-subtle bg-surface p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-taupe">Label</span>
                  <input value={addr.label} onChange={(e) => updateAddress(i, { label: e.target.value })} placeholder="Home, Work…" className={inputClass} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-taupe">Address</span>
                  <input value={addr.line1} onChange={(e) => updateAddress(i, { line1: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-taupe">City</span>
                  <input value={addr.city} onChange={(e) => updateAddress(i, { city: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-taupe">State</span>
                  <input value={addr.state} onChange={(e) => updateAddress(i, { state: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-taupe">Pincode</span>
                  <input value={addr.pincode} onChange={(e) => updateAddress(i, { pincode: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-taupe">Phone</span>
                  <input value={addr.phone} onChange={(e) => updateAddress(i, { phone: e.target.value })} className={inputClass} />
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-taupe">
                  <input
                    type="radio"
                    name="default-address"
                    checked={addr.isDefault}
                    onChange={() => setDefault(i)}
                    className="h-4 w-4 text-midnight focus:ring-midnight"
                  />
                  Default
                </label>
                <button
                  type="button"
                  onClick={() => removeAddress(i)}
                  className="text-xs font-medium text-taupe-muted hover:text-bad"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={addAddress}
            disabled={addresses.length >= MAX_ADDRESSES}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-taupe transition hover:bg-sand-deep disabled:opacity-50"
          >
            Add address
          </button>
          <button
            type="button"
            onClick={saveAddresses}
            disabled={addrBusy}
            className="rounded-lg bg-midnight px-5 py-2 text-sm font-semibold text-sand transition hover:bg-midnight-hover disabled:opacity-60"
          >
            {addrBusy ? "Saving…" : "Save addresses"}
          </button>
        </div>
      </section>
    </div>
  );
}
