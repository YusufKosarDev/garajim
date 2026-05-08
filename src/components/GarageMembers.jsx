import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  Users, UserPlus, Mail, Trash2, Loader2, X,
  Crown, Clock, Send, Copy, Check
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
  const { user } = useAuth()

  const [garage, setGarage] = useState(null)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)

  // Davet etme state
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Owner mu kullanıcı?
  const isOwner = garage && garage.owner_id === user?.id

  // İlk yüklemede verileri al
  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Kullanıcının sahibi olduğu garaj
      const { data: garageData, error: garageError } = await supabase
        .from('garages')
        .select('id, name, owner_id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (garageError) throw garageError
      
      if (!garageData) {
        // Garaj yok? Beklenmedik durum, ama default'a düş
        setGarage(null)
        setMembers([])
        setInvitations([])
        setLoading(false)
        return
      }

      setGarage(garageData)

      // 2. Garajın üyelerini al
      // Note: garage_members.user_id → auth.users join'i RLS'siz değil,
      // o yüzden user.id ile join yapacağız (basit yaklaşım)
      const { data: membersData, error: membersError } = await supabase
        .from('garage_members')
        .select('id, user_id, role, joined_at')
        .eq('garage_id', garageData.id)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError

      // Kullanıcı emaillerini almak için auth.admin gerek (frontend'den yok)
      // Workaround: mevcut user'ın bilgisi var, diğerlerini "User ..." olarak göster
      // Production'da: profiles tablosu kullanılabilir
      setMembers(membersData || [])

      // 3. Bekleyen davetleri al
      const { data: invitesData, error: invitesError } = await supabase
        .from('garage_invitations')
        .select('id, email, status, expires_at, created_at')
        .eq('garage_id', garageData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitesError) throw invitesError

      setInvitations(invitesData || [])
    } catch (err) {
      console.error('Load garage data error:', err)
      toast.error('Üye bilgileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Davet gönder
  const handleInvite = async (e) => {
    e?.preventDefault()

    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast.error('Geçerli bir email adresi gir')
      return
    }

    setInviting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Oturum bulunamadı')
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
        toast.error(result.error || 'Davet gönderilemedi')
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
      toast.error('Bir hata oluştu')
    } finally {
      setInviting(false)
    }
  }

  // Davet iptali (status = cancelled)
  const handleCancelInvite = async (invitationId) => {
    const confirmed = window.confirm('Bu daveti iptal etmek istediğine emin misin?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('garage_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)

      if (error) throw error

      toast.success('Davet iptal edildi')
      await loadData()
    } catch (err) {
      console.error('Cancel invite error:', err)
      toast.error('Davet iptal edilemedi')
    }
  }

  // Üyeyi çıkar
  const handleRemoveMember = async (memberId, memberRole) => {
    if (memberRole === 'owner') {
      toast.error('Owner çıkarılamaz')
      return
    }

    const confirmed = window.confirm('Bu üyeyi garajdan çıkarmak istediğine emin misin?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('garage_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Üye çıkarıldı')
      await loadData()
    } catch (err) {
      console.error('Remove member error:', err)
      toast.error('Üye çıkarılamadı')
    }
  }

  // Davet linkini kopyala
  const handleCopyLink = async () => {
    if (!lastInviteUrl) return
    try {
      await navigator.clipboard.writeText(lastInviteUrl)
      setCopied(true)
      toast.success('Link kopyalandı 📋')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Kopyalanamadı')
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
        Garaj Üyeleri
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Garajına başkalarını davet et — araçları birlikte yönetin.
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
                Henüz üye yok
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
                          <span className="text-xs text-slate-400 ml-2">(sen)</span>
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
                        ÜYE
                      </span>
                    )}
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.role)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition"
                        title="Üyeyi çıkar"
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
                  Yeni Üye Davet Et
                </button>
              ) : (
                <form onSubmit={handleInvite} className="bg-slate-800/50 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Davet edilecek email
                  </label>
                  <div className="relative mb-3">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ornek@email.com"
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
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Daveti Gönder
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
                      İptal
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
                💡 Davet linkini manuel paylaşmak istersen:
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
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Kopyala
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
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition flex-shrink-0"
                      title="Daveti iptal et"
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
    </div>
  )
}