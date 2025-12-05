// File: payload.js


class NutriScanPayload {

    //PAYLOAD
    static createBasicPayload(imageBase64, prompt = "Analisis gambar label makanan ini") {


        const payload = {
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
                temperature: 0.2,
                maxOutputTokens: 1000
            }
        };

        return payload;
    }

    //ANALISIS NUTRISI
    static createNutritionPayload(imageBase64, userConditions = []) {

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

    //GENERATE CURL COMMAND
    static generateCurlCommand(payload, apiKey) {

        //Format payload untuk command line
        const payloadJson = JSON.stringify(payload)
            .replace(/'/g, "'\\''")  // Escape single quotes untuk bash
            .replace(/"/g, '\\"');   // Escape double quotes

        //CURL COMMAND
        const curlCommand = `curl -X POST \\
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadJson}'`;

        return curlCommand;
    }

    //SIMULASI KIRIM PAYLOAD (fetch)
    static async sendToAI(payload, apiKey) {

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        try {
            console.log('📤 Mengirim payload ke AI...');

            //CURL VERSI JAVASCRIPT (fetc)
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Response diterima dari AI');

            return this.parseAIResponse(data);

        } catch (error) {
            console.error('❌ Error:', error);
            throw error;
        }
    }

    //RESPONSE DARI AI
    static parseAIResponse(aiResponse) {
        try {
            const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                return {
                    productName: "Produk (Gagal Parse)",
                    calories: 0,
                    sugar: 0,
                    sodium: 0,
                    fat: 0,
                    riskLevel: 'sedang',
                    recommendations: ['Data tidak lengkap atau format salah']
                };
            }

        } catch (error) {
            console.warn('⚠️ Gagal parse, menggunakan data default', error);
            return {
                productName: "Error Parsing",
                calories: 0,
                sugar: 0,
                sodium: 0,
                fat: 0,
                riskLevel: 'sedang',
                recommendations: ['Gagal menganalisis respons AI']
            };
        }
    }


    static cleanBase64(base64String) {
        return base64String.replace(/^data:image\/\w+;base64,/, '');
    }

    //CONVERT FILE TO BASE64
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}


//BACA .env
class EnvConfig {
    // 🗝️ API KEY
    static apiKey = ""; // Kosongkan

    static loadConfig() {
        const savedKey = localStorage.getItem('GEMINI_API_KEY');
        if (savedKey) {
            this.apiKey = savedKey;
        }

        console.log('✅ Config loaded.');
    }

    static setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('GEMINI_API_KEY', key);
    }

    static getApiKey() {
        if (!this.apiKey) {
            this.loadConfig();
        }
        return this.apiKey;
    }

    // Info display
    static getAppInfo() {
        return {
            name: "NutriScan Payload Demo",
            version: "1.0.0",
            developer: "Rafaela & Benjamin",
            apiProvider: "Google Gemini AI"
        };
    }
}

// Export untuk global window
window.NutriScanPayload = NutriScanPayload;
window.EnvConfig = EnvConfig;
