'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateStudio, updateStudioLogo, updateStudioCover } from '@/app/actions/studio'
import { compressImage } from '@/lib/compress-image'
import { Upload, Image as ImageIcon } from 'lucide-react'

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Accra',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/London',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
]

export default function SettingsForm({
  studioId,
  name,
  email,
  slug,
  phone,
  address,
  timezone,
  logoUrl,
  coverUrl,
  bio,
  siteUrl,
}: {
  studioId: string
  name: string
  email: string
  slug: string
  phone: string
  address: string
  timezone: string
  logoUrl: string | null
  coverUrl: string | null
  bio: string
  siteUrl: string
}) {
  const [form, setForm] = useState({ name, email, slug, phone, address, timezone, bio })
  const [loading, setLoading] = useState(false)
  
  const [logo, setLogo] = useState<string | null>(logoUrl)
  const [logoLoading, setLogoLoading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [cover, setCover] = useState<string | null>(coverUrl)
  const [coverLoading, setCoverLoading] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  function slugify(value: string) {
    return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await updateStudio(form)
    if (error) toast.error(error)
    else toast.success('Studio profile updated')
    setLoading(false)
  }

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    if (!raw) return

    setLogoLoading(true)
    const file = await compressImage(raw, 'avatar').catch(() => raw)
    const path = `studio/${studioId}_logo_${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: 'image/jpeg' })

    if (uploadError) {
      toast.error(uploadError.message)
      setLogoLoading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const result = await updateStudioLogo(data.publicUrl)
    if (result.error) toast.error(result.error)
    else {
      setLogo(data.publicUrl)
      toast.success('Logo updated')
    }
    setLogoLoading(false)
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    if (!raw) return

    setCoverLoading(true)
    const file = await compressImage(raw, 'gallery').catch(() => raw) // Higher quality for cover
    const path = `studio/${studioId}_cover_${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: 'image/jpeg' })

    if (uploadError) {
      toast.error(uploadError.message)
      setCoverLoading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const result = await updateStudioCover(data.publicUrl)
    if (result.error) toast.error(result.error)
    else {
      setCover(data.publicUrl)
      toast.success('Cover photo updated')
    }
    setCoverLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-base font-semibold text-[var(--text-1)] mb-4">Branding</h2>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Logo Upload */}
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-3">Studio Logo</label>
            <div className="flex items-center gap-4">
              <div 
                className="w-20 h-20 rounded-full bg-[var(--bg-hover)] border border-[var(--line)] flex items-center justify-center overflow-hidden flex-shrink-0"
              >
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-[var(--text-3)]" />
                )}
              </div>
              <div>
                <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoFile} />
                <button 
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoLoading}
                  className="px-4 py-2 bg-[var(--btn)] text-[var(--btn-fg)] text-[13px] font-medium rounded-lg hover:brightness-110 transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {logoLoading ? 'Uploading...' : 'Upload logo'}
                </button>
                <p className="text-[12px] text-[var(--text-3)] mt-2">Recommended: 400x400px square image.</p>
              </div>
            </div>
          </div>

          {/* Cover Upload */}
          <div className="flex-1">
            <label className="block text-[13px] text-[var(--text-2)] mb-3">Storefront Cover Photo</label>
            <div 
              className="relative w-full h-32 rounded-xl bg-[var(--bg-hover)] border border-[var(--line)] border-dashed flex items-center justify-center overflow-hidden group cursor-pointer"
              onClick={() => coverInputRef.current?.click()}
            >
              {cover && (
                <img src={cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:brightness-50" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--card)]/80 backdrop-blur border border-[var(--line)] flex items-center justify-center shadow-sm text-[var(--text-2)] group-hover:text-[var(--primary)] transition">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[12px] font-medium text-[var(--text-1)] bg-[var(--card)]/60 px-2 py-0.5 rounded backdrop-blur">
                  {coverLoading ? 'Uploading...' : cover ? 'Change cover photo' : 'Upload cover photo'}
                </span>
              </div>
              <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverFile} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-base font-semibold text-[var(--text-1)] mb-4">Studio Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Studio Name</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Public Email</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Studio Bio (Storefront description)</label>
            <textarea 
              value={form.bio} 
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3}
              placeholder="Tell clients about your photography style and experience..."
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Phone Number</label>
            <input 
              type="text" 
              value={form.phone} 
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Location / Address</label>
            <input 
              type="text" 
              value={form.address} 
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition"
            />
          </div>
          
          <div className="md:col-span-2 border-t border-[var(--line)] my-2"></div>

          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Storefront URL</label>
            <div className="flex rounded-lg overflow-hidden border border-[var(--line)] focus-within:border-[var(--primary)] transition">
              <span className="bg-[var(--bg-hover)] px-3 py-2 text-[13px] text-[var(--text-3)] border-r border-[var(--line)] select-none flex items-center">
                {siteUrl.replace(/^https?:\/\//, '')}/
              </span>
              <input 
                type="text" 
                value={form.slug} 
                onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                className="flex-1 bg-[var(--bg)] px-3 py-2 text-[14px] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-[14px] font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
