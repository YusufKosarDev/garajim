/**
 * Fiş fotoğrafından metin çıkarma (Tesseract.js).
 *
 * İki tasarım kararı:
 *
 * 1. DİNAMİK IMPORT. tesseract.js + WASM çekirdeği birkaç yüz kB; OCR'ı hiç
 *    kullanmayan kullanıcı bunu indirmesin diye ilk çağrıda yükleniyor.
 *    Statik import ana bundle'ı büyütürdü (bkz. madde 13).
 *
 * 2. FOTOĞRAF CİHAZDAN ÇIKMIYOR. Tanıma tarayıcıda, WASM ile yapılıyor; hiçbir
 *    OCR servisine istek gitmiyor, API anahtarı yok. Tek dış istek Türkçe dil
 *    verisi (~2 MB, tessdata CDN'i) ve o da Tesseract tarafından IndexedDB'ye
 *    önbelleklendiği için yalnızca ilk kullanımda iniyor.
 */

let workerPromise: Promise<TesseractWorkerBenzeri> | null = null

interface RecognizeResult {
  data: { text: string; confidence: number }
}

interface TesseractWorkerBenzeri {
  recognize: (image: unknown) => Promise<RecognizeResult>
  terminate: () => Promise<unknown>
}

/**
 * Worker tek örnek ve KASITLI OLARAK ayakta bırakılıyor: başlatmak (WASM derleme
 * + dil verisi yükleme) saniyeler sürüyor, kullanıcı arka arkaya birkaç fiş
 * tarayabilir. Kapatma `ocrKapat` ile açıkça yapılıyor.
 */
const workerAl = async (): Promise<TesseractWorkerBenzeri> => {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('tur') as unknown as Promise<TesseractWorkerBenzeri>)
      .catch(error => {
        // Başarısız sözü saklı tutmuyoruz; ağ döndüğünde tekrar denenebilsin
        workerPromise = null
        throw error
      })
  }
  return workerPromise
}

export interface OcrResult {
  text: string
  /** Tesseract'ın 0-100 arası güven skoru — düşükse kullanıcı uyarılıyor */
  confidence: number
}

/**
 * @param gorsel base64 data URL, Blob, File ya da <img> — Tesseract hepsini kabul eder
 */
export const readTextFromReceipt = async (image: string | Blob): Promise<OcrResult> => {
  const worker = await workerAl()
  const result = await worker.recognize(image)
  return {
    text: result?.data?.text ?? '',
    confidence: result?.data?.confidence ?? 0,
  }
}

/** Worker'ı ve WASM belleğini serbest bırakır (modal kapanınca çağrılıyor) */
export const closeOcrWorker = async (): Promise<void> => {
  if (!workerPromise) return
  const soz = workerPromise
  workerPromise = null
  try {
    const worker = await soz
    await worker.terminate()
  } catch {
    // Zaten başlatılamamış ya da kapanmış worker — kapatma hatası kullanıcıyı ilgilendirmez
  }
}
