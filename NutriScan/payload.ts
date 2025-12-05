// File: payload.ts
// ==================== TIPE DATA SEDERHANA ====================

// 🎯 Interface untuk Payload ke Gemini AI
export interface GeminiPayload {
    contents: {
        parts: (
            | { text: string }  // Prompt untuk AI
            | { inline_data: { mime_type: string; data: string } } // Gambar dalam base64
        )[]
    }[];
    generationConfig?: {
        temperature: number;     // 0.1 = konsisten, 1.0 = kreatif
        maxOutputTokens: number; // Panjang respons maksimal
    };
}

// 🎯 Interface untuk hasil nutrisi
export interface NutritionResult {
    productName: string;
    calories: number;
    sugar: number;   // gram
    sodium: number;  // mg
    fat: number;     // gram
    riskLevel: 'aman' | 'sedang' | 'berisiko';
    recommendations: string[];
}

// ==================== KELAS UTAMA: PAYLOAD BUILDER ====================

export class NutriScanPayload {

    // 🎯 METHOD 1: BUAT PAYLOAD DASAR
    static createBasicPayload(
        imageBase64: string,
        prompt: string = "Analisis gambar label makanan ini"
    ): GeminiPayload {

        // 🎯 INI PAYLOAD INTINYA!
        const payload: GeminiPayload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: this.cleanBase64(imageBase64)
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.2,      // Tidak terlalu kreatif (lebih akurat)
                maxOutputTokens: 1000  // Respons cukup panjang
            }
        };

        return payload;
    }

    // 🎯 METHOD 2: BUAT PAYLOAD UNTUK ANALISIS NUTRISI
    static createNutritionPayload(
        imageBase64: string,
        userConditions: string[] = []
    ): GeminiPayload {

        const conditionsText = userConditions.length > 0
            ? `Pengguna memiliki kondisi: ${userConditions.join(', ')}. `
            : '';

        const prompt = `${conditionsText}
        
ANDA ADALAH AHLI GIZI BPOM INDONESIA.

TUGAS: Analisis gambar label makanan ini.

EKSTRAK INFORMASI:
1. Nama produk
2. Kalori per saji (kkal)
3. Gula (gram)
4. Natrium (mg)
5. Lemak total (gram)

HITUNG RISIKO:
- Jika gula > 10g: risiko untuk diabetes
- Jika natrium > 400mg: risiko untuk hipertensi
- Jika lemak > 15g: risiko untuk kolesterol

FORMAT OUTPUT HARUS JSON:
{
  "productName": "string",
  "calories": number,
  "sugar": number,
  "sodium": number,
  "fat": number,
  "riskLevel": "aman" | "sedang" | "berisiko",
  "recommendations": ["string"]
}

Gunakan bahasa Indonesia.`;

        return this.createBasicPayload(imageBase64, prompt);
    }

    // 🎯 METHOD 3: GENERATE CURL COMMAND
    static generateCurlCommand(payload: GeminiPayload, apiKey: string): string {

        // Format payload untuk command line
        const payloadJson = JSON.stringify(payload)
            .replace(/'/g, "'\\''")  // Escape single quotes untuk bash
            .replace(/"/g, '\\"');   // Escape double quotes

        // 🎯 INI CURL COMMAND NYA!
        const curlCommand = `curl -X POST \\
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadJson}'`;

        return curlCommand;
    }

    // 🎯 METHOD 4: SIMULASI KIRIM PAYLOAD (fetch)
    static async sendToAI(
        payload: GeminiPayload,
        apiKey: string
    ): Promise<NutritionResult> {

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`;

        try {
            console.log('📤 Mengirim payload ke AI...');

            // 🎯 INI "CURL" VERSI JAVASCRIPT (fetch)
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Response diterima dari AI');

            // Parse response (sederhana)
            return this.parseAIResponse(data);

        } catch (error) {
            console.error('❌ Error:', error);
            throw error;
        }
    }

    // 🎯 METHOD 5: PARSE RESPONSE DARI AI
    private static parseAIResponse(aiResponse: any): NutritionResult {
        try {
            // AI biasanya mengembalikan teks, kita cari JSON
            const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Cari JSON dalam teks
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // Fallback jika AI tidak return JSON
                return {
                    productName: "Produk",
                    calories: 0,
                    sugar: 0,
                    sodium: 0,
                    fat: 0,
                    riskLevel: 'sedang',
                    recommendations: ['Data tidak lengkap']
                };
            }

        } catch (error) {
            console.warn('⚠️ Gagal parse, menggunakan data default');
            return {
                productName: "Error",
                calories: 0,
                sugar: 0,
                sodium: 0,
                fat: 0,
                riskLevel: 'sedang',
                recommendations: ['Gagal menganalisis']
            };
        }
    }

    // 🎯 HELPER: BERSIHKAN BASE64
    private static cleanBase64(base64String: string): string {
        // Hapus "data:image/jpeg;base64," bagian depan
        return base64String.replace(/^data:image\/\w+;base64,/, '');
    }

    // 🎯 HELPER: CONVERT FILE TO BASE64
    static async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }
}

// ==================== CONFIGURATION ====================

// 🎯 KELAS UNTUK BACA .env
export class EnvConfig {
    // 🗝️ API KEY DISEDIAKAN OLEH PERANCANG
    private static apiKey: string = "AIzaSyBnu0H-5RSwGRzBp57QsbnCUfSD3r3Wu7M";

    // Load config (simulasi baca .env)
    static loadConfig(): void {
        // Di backend asli, ini baca dari file .env
        // Tapi untuk frontend, kita simpan di variable

        this.apiKey = "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // 🎯 API KEY KITA

        console.log('✅ Config loaded. API Key ready!');
        console.log('🔧 Mode: Development dengan API Key perancang');
    }

    static getApiKey(): string {
        if (!this.apiKey) {
            this.loadConfig();
        }
        return this.apiKey;
    }

    // Info untuk display
    static getAppInfo() {
        return {
            name: "NutriScan Payload Demo",
            version: "1.0.0",
            developer: "Rafaela & Benjamin",
            apiProvider: "Google Gemini AI"
        };
    }
}

// ==================== CONTOH PENGGUNAAN ====================

// Contoh cara pakai:
export async function demoUsage() {
    console.log('🚀 Memulai demo NutriScan Payload...');

    // 1. Load config (.env)
    EnvConfig.loadConfig();
    const apiKey = EnvConfig.getApiKey();
    const info = EnvConfig.getAppInfo();

    console.log(`📱 ${info.name} v${info.version}`);
    console.log(`👨‍💻 Dibuat oleh: ${info.developer}`);
    console.log(`🤖 Menggunakan: ${info.apiProvider}`);

    // 2. Contoh base64 image (dalam praktik, dapatkan dari file)
    const exampleBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z";

    // 3. Buat payload untuk nutrisi
    const payload = NutriScanPayload.createNutritionPayload(exampleBase64, ["diabetes"]);

    console.log('📦 Payload yang dibuat:', JSON.stringify(payload, null, 2));

    // 4. Generate CURL command
    const curlCommand = NutriScanPayload.generateCurlCommand(payload, apiKey);
    console.log('💻 CURL Command:', curlCommand);

    // 5. (Opsional) Kirim ke AI
    // const result = await NutriScanPayload.sendToAI(payload, apiKey);
    // console.log('📊 Hasil dari AI:', result);

    return {
        payload,
        curlCommand,
        // result
    };
}

// Export untuk digunakan di HTML
if (typeof window !== 'undefined') {
    (window as any).NutriScanPayload = NutriScanPayload;
    (window as any).EnvConfig = EnvConfig;
    (window as any).demoUsage = demoUsage;
}