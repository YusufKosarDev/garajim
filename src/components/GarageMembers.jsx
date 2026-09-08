import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { 
  Users, UserPlus, Mail, Trash2, Loader2, X,
  Crown, Clock, Send, Copy, Check
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/auth-context'
import ConfirmDialog from './ConfirmDialog'

/**
 * GarageMembers — Garajın üyelerini ve davetleri yönetir
 * 
 * Özellikler:
 *   - Mevcut üyeleri listele (owner badge, email)
 *   - Yeni üye davet et (email + Edge Function)
 *   - Bekleyen davetleri listele + iptal
 *   - Üyeyi çıkarma (sadece owner)
 *   - Davet linkini kopyala (email gitmediyse manuel)
 */
export default function GarageMembers() {
  const { t } = useTranslation()

  const { user } = useAuth()

  // Davet etme state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [cancelInviteTarget, setCancelInviteTarget] = useState(null)
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null)

  // Okuma katmanı TanStack Query'de — uygulamanın geri kalanıyla aynı desen
  // (bkz. VehicleContext). Eskiden elle yazılmış bir useEffect + üç ayrı state
  // + bir `loading` bayrağı vardı; efekt gövdesinden senkron setState çağırdığı
  // için fazladan render turları tetikliyordu (react-hooks/set-state-in-effect).
  // Query ile birlikte yeniden deneme, pencere odaklanınca tazeleme ve
  // isteklerin birleştirilmesi de bedavaya geliyor.
  const {
    data: garageData,
    isPending: loading,
    error: loadError,
    refetch: loadData,
  } = useQuery({
    queryKey: ['garaj-uyeleri', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      // 1. Kullanıcının sahibi olduğu garaj
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('id, name, owner_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (garageError) throw garageError

      // Garaj yok? Beklenmedik durum, ama default'a düş
      if (!garageData) return { garage: null, members: [], invitations: [] }

      // 2. Garajın üyelerini al
      // Note: garage_members.user_id → auth.users join'i RLS'siz değil,
      // o yüzden user.id ile join yapacağız (basit yaklaşım)
      const { data: membersData, error: membersError } = await supabase
        .from('garage_members')
        .select('id, user_id, role, joined_at')
        .eq('garage_id', garageData.id)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError

      // 3. Bekleyen davetleri al
      const { data: invitesData, error: invitesError } = await supabase
        .from('garage_invitations')
        .select('id, email, status, expires_at, created_at')
        .eq('garage_id', garageData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitesError) throw invitesError

      // Kullanıcı emaillerini almak için auth.admin gerek (frontend'den yok)
      // Workaround: mevcut user'ın bilgisi var, diğerlerini "User ..." olarak göster
      // Production'da: profiles tablosu kullanılabilir
      return {
        garage: garageData,
        members: membersData || [],
        invitations: invitesData || [],
      }
    },
  })

  const garage = garageData?.garage ?? null
  const members = garageData?.members ?? []
  const invitations = garageData?.invitations ?? []

  // Owner mu kullanıcı?
  const isOwner = garage && garage.owner_id === user?.id

  // Yükleme hatasını kullanıcıya bildir. Efekt içinde setState YOK — sadece
  // toast, yani gerçek bir yan etki.
  useEffect(() => {
    if (!loadError) return
    console.error('Load garage data error:', loadError)
    toast.error(t('garageMembers.uye_bilgileri_yuklenemedi'))
  }, [loadError, t])

  // Davet gönder
  const handleInvite = async (e) => {
    e?.preventDefault()

    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast.error(t('garageMembers.gecerli_bir_email_adresi_gir'))
      return
    }

    setInviting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error(t('garageMembers.oturum_bulunamadi'))
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-member`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || t('garageMembers.davet_gonderilemedi'))
        return
      }

      // Başarı
      if (result.email_sent) {
        toast.success(`Davet gönderildi: ${email} 📧`)
      } else {
        toast.success(`Davet oluşturuldu, ama email gönderilemedi. Linki manuel paylaşabilirsin.`, {
          duration: 6000,
        })
      }

      // İçeriği güncelle
      setLastInviteUrl(result.invite_url)
      setInviteEmail('')
      setShowInviteForm(false)
      await loadData()
    } catch (err) {
      console.error('Invite error:', err)
      toast.error(t('garageMembers.bir_hata_olustu'))
    } finally {
      setInviting(false)
    }
  }

  // Davet iptali (status = cancelled)
  const handleCancelInvite = async (invitationId) => {
    setCancelInviteTarget(null)
    try {
      const { error } = await supabase
        .from('garage_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)

      if (error) throw error

      toast.success(t('garageMembers.davet_iptal_edildi'))
      await loadData()
    } catch (err) {
      console.error('Cancel invite error:', err)
      toast.error(t('garageMembers.davet_iptal_edilemedi'))
    }
  }

  // Üyeyi çıkar (onay diyaloğundan sonra çağrılır)
  const handleRemoveMember = async (memberId) => {
    setRemoveMemberTarget(null)
    try {
      const { error } = await supabase
        .from('garage_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success(t('garageMembers.uye_cikarildi'))
      await loadData()
    } catch (err) {
      console.error('Remove member error:', err)
      toast.error(t('garageMembers.uye_cikarilamadi'))
    }
  }

  // Davet linkini kopyala
  const handleCopyLink = async () => {
    if (!lastInviteUrl) return
    try {
      await navigator.clipboard.writeText(lastInviteUrl)
      setCopied(true)
      toast.success(t('garageMembers.link_kopyalandi'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('garageMembers.kopyalanamadi'))
    }
  }

  // Tarih formatla
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-400" />
        {t('garageMembers.garaj_uyeleri')}
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        {t('garageMembers.garajina_baskalarini_davet_et_araclari_birlikte')}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Üye Listesi */}
          <div className="space-y-2 mb-4">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                {t('garageMembers.henuz_uye_yok')}
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                      member.role === 'owner' 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-500'
                    }`}>
                      {member.user_id === user?.id ? user?.email?.[0]?.toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white font-medium truncate">
                        {member.user_id === user?.id ? user?.email : 'Üye (kullanıcı)'}
                        {member.user_id === user?.id && (
                          <span className="text-xs text-slate-400 ml-2">{t('garageMembers.sen')}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(member.joined_at)} tarihinde katıldı
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {member.role === 'owner' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                        <Crown className="w-3 h-3" />
                        OWNER
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">
                        {t('garageMembers.uye')}
                      </span>
                    )}
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => setRemoveMemberTarget(member)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition"
                        title={t('garageMembers.uyeyi_cikar')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Davet Et Butonu/Form */}
          {isOwner && (
            <>
              {!showInviteForm ? (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold transition mb-4"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('garageMembers.yeni_uye_davet_et')}
                </button>
              ) : (
                <form onSubmit={handleInvite} className="bg-slate-800/50 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('garageMembers.davet_edilecek_email')}
                  </label>
                  <div className="relative mb-3">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t('garageMembers.ornek_email_com')}
                      autoComplete="email"
                      disabled={inviting}
                      autoFocus
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition disabled:opacity-50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('garageMembers.gonderiliyor')}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t('garageMembers.daveti_gonder')}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteForm(false)
                        setInviteEmail('')
                      }}
                      disabled={inviting}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                    >
                      {t('garageMembers.iptal')}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Son davet linkini göster (manuel paylaşım için) */}
          {lastInviteUrl && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-300 mb-2">
                {t('garageMembers.davet_linkini_manuel_paylasmak_istersen')}
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-xs text-blue-300 truncate font-mono">
                  {lastInviteUrl}
                </code>
                <button
                  onClick={handleCopyLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-semibold transition flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t('garageMembers.kopyalandi')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {t('garageMembers.kopyala')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bekleyen Davetler */}
          {invitations.length > 0 && (
            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                Bekleyen Davetler ({invitations.length})
              </h3>
              <div className="space-y-2">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 border border-slate-700"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white truncate">
                          {invite.email}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(invite.created_at)} tarihinde davet edildi
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setCancelInviteTarget(invite)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition flex-shrink-0"
                      title={t('garageMembers.daveti_iptal_et')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!cancelInviteTarget}
        onClose={() => setCancelInviteTarget(null)}
        onConfirm={() => handleCancelInvite(cancelInviteTarget.id)}
        title={t('garageMembers.davet_iptal_edilsin_mi')}
        message={
          cancelInviteTarget
            ? `${cancelInviteTarget.email} adresine gönderilen davet iptal edilecek.`
            : ''
        }
        confirmText="Evet, iptal et"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={!!removeMemberTarget}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={() => handleRemoveMember(removeMemberTarget.id)}
        title={t('garageMembers.uye_garajdan_cikarilsin_mi')}
        message="Bu üye artık garajdaki araçlara ve kayıtlara erişemeyecek."
        confirmText="Evet, çıkar"
      />
    </div>
  )
}