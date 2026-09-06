/**
 * Tarayıcıya dosya indirtir.
 *
 * Bu blob + <a download> + revokeObjectURL kalıbı csvExporter ve backup'ta ayrı
 * ayrı yazılmıştı; ICS dışa aktarımı üçüncü kopya olacaktı. Tek yerde duruyor.
 */
export const downloadFile = (icerik: string | Blob, dosyaAdi: string, mime: string): void => {
  const blob = icerik instanceof Blob ? icerik : new Blob([icerik], { type: mime })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = dosyaAdi
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Hemen iptal etmek bazı tarayıcılarda indirmeyi yarıda kesiyor; bir tik bekliyoruz
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
