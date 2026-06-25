import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with a large limit for image upload
  app.use(express.json({ limit: "25mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini/analyze-label", async (req, res) => {
    try {
      const { image, width, height, userApiKey } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh." });
      }
      const labelWidth = Number(width) || 65;
      const labelHeight = Number(height) || 45;

      const apiKeyToUse = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKeyToUse) {
        return res.status(400).json({
          error: "Không tìm thấy Gemini API Key. Vui lòng cung cấp API Key cá nhân trong phần Cấu hình hoặc kiểm tra biến môi trường GEMINI_API_KEY."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKeyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Remove base64 mime type prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const systemInstruction = `
Bạn là một kỹ sư thị giác máy tính hàng đầu chuyên phân tích mẫu nhãn dán, tem nhãn, nhãn vạch (barcode) và nhãn QR từ hình ảnh chụp hoặc ảnh chụp màn hình.
Nhiệm vụ của bạn là bóc tách tất cả phần tử trong ảnh thành một danh sách đối tượng thiết kế chuẩn hóa.

KÍCH THƯỚC NHÃN:
Nhãn tem này có kích thước thực tế là: Chiều rộng = ${labelWidth} mm, Chiều cao = ${labelHeight} mm.

HỆ TỌA ĐỘ CHUẨN HÓA (Gốc tọa độ trung tâm):
- Điểm trung tâm của nhãn dán là tọa độ (0, 0).
- Trục hoành (X): Chạy từ trái qua phải, giới hạn từ -${labelWidth / 2} đến ${labelWidth / 2} mm.
- Trục tung (Y): Chạy từ trên xuống dưới, giới hạn từ -${labelHeight / 2} đến ${labelHeight / 2} mm.
Mọi phần tử (x, y) phải được định vị trong phạm vi này của nhãn để nằm vừa vặn hoàn hảo.

CÁC LOẠI PHẦN TỬ CẦN NHẬN DIỆN VÀ ĐẶC TÍNH:
1. "text" (Chữ/Văn bản):
   - content: Văn bản thực xuất hiện trong ảnh nhãn.
   - fontWeight: "bold" nếu chữ đậm, "normal" nếu chữ thường.
   - textAlign: Căn lề của chữ ("left", "center", "right").
   - textFlowOrigin: Sử dụng "center" cho chữ căn giữa (rất phổ biến), "center-left" cho chữ căn trái, "center-right" cho chữ căn phải.
   - fontSize: Ước lượng kích thước font chữ (ví dụ 7, 8, 9, 10, 11, 12, 14, 18 pt).
2. "barcode" (Mã vạch):
   - content: Giá trị hiển thị bên dưới hoặc nội dung mã vạch nếu đọc được (ví dụ: "VND-2026-06", "8931234567890", ...).
   - barcodeFormat: Chọn "CODE128" (phổ biến nhất cho mã chữ+số), "EAN13" (mã vạch hàng hóa 13 số), hoặc "CODE39" (chữ+số ngắn).
   - displayValue: Luôn là true.
   - barcodeHeight: Chiều cao mã vạch bằng mm (ví dụ 10, 12, 15 mm).
3. "qrcode" (Mã QR):
   - content: Đường dẫn URL hoặc nội dung text của mã QR.
4. "shape" (Hình khối, đường kẻ):
   - shapeType: "line" nếu là đường kẻ gạch ngang/dọc, hoặc "rect" nếu là khung viền hình chữ nhật bọc quanh, hoặc "circle"/"oval".
   - shapeStrokeWidth: Độ dày nét vẽ (ví dụ 0.5, 1.0, 1.5 mm).
   - shapeStrokeStyle: "solid" (liền mạch), "dashed" (đứt quãng), hoặc "dotted".

YÊU CẦU:
- Hãy ước lượng kích thước (width, height) và tọa độ trung tâm (x, y) của từng phần tử một cách tương đối chính xác nhất theo mm.
- Tuyệt đối không để các phần tử bị chồng chéo lên nhau ngoài ý muốn trừ khi thiết kế gốc hiển thị như vậy.
- Trả về đúng định dạng JSON theo cấu trúc schema được yêu cầu.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          objects: {
            type: Type.ARRAY,
            description: "Danh sách các phần tử thiết kế được nhận diện trên nhãn tem",
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ["text", "barcode", "qrcode", "shape"],
                  description: "Loại phần tử"
                },
                x: {
                  type: Type.NUMBER,
                  description: "Tọa độ X của tâm phần tử so với tâm của nhãn tem (0,0) bằng mm"
                },
                y: {
                  type: Type.NUMBER,
                  description: "Tọa độ Y của tâm phần tử so với tâm của nhãn tem (0,0) bằng mm"
                },
                width: {
                  type: Type.NUMBER,
                  description: "Chiều rộng của phần tử bằng mm"
                },
                height: {
                  type: Type.NUMBER,
                  description: "Chiều cao của phần tử bằng mm"
                },
                content: {
                  type: Type.STRING,
                  description: "Nội dung chữ, hoặc mã vạch, hoặc nội dung mã QR. Đối với shape thì để rỗng."
                },
                fontSize: {
                  type: Type.NUMBER,
                  description: "Cỡ chữ tính theo pt (chỉ dùng cho text, ví dụ: 8, 10, 12, 14, 18)"
                },
                fontWeight: {
                  type: Type.STRING,
                  enum: ["normal", "bold"],
                  description: "Độ đậm của chữ (chỉ dùng cho text)"
                },
                textAlign: {
                  type: Type.STRING,
                  enum: ["left", "center", "right"],
                  description: "Căn lề chữ (chỉ dùng cho text)"
                },
                textFlowOrigin: {
                  type: Type.STRING,
                  enum: ["center", "center-left", "top-left", "top-center"],
                  description: "Gốc định vị văn bản. Khuyên dùng 'center' cho chữ căn giữa, 'center-left' cho chữ căn trái."
                },
                barcodeFormat: {
                  type: Type.STRING,
                  enum: ["CODE128", "EAN13", "CODE39"],
                  description: "Định dạng mã vạch (chỉ dùng cho barcode)"
                },
                displayValue: {
                  type: Type.BOOLEAN,
                  description: "Hiển thị chữ dưới mã vạch hay không (chỉ dùng cho barcode)"
                },
                barcodeWidth: {
                  type: Type.NUMBER,
                  description: "Độ rộng nét vẽ mã vạch (ví dụ 1.2, 1.4, 1.6, 2)"
                },
                barcodeHeight: {
                  type: Type.NUMBER,
                  description: "Chiều cao mã vạch bằng mm (chỉ dùng cho barcode)"
                },
                shapeType: {
                  type: Type.STRING,
                  enum: ["line", "rect", "circle", "oval"],
                  description: "Loại hình khối (chỉ dùng cho shape)"
                },
                shapeStrokeWidth: {
                  type: Type.NUMBER,
                  description: "Độ dày nét vẽ hình khối bằng mm (chỉ dùng cho shape)"
                },
                shapeStrokeStyle: {
                  type: Type.STRING,
                  enum: ["solid", "dashed", "dotted"],
                  description: "Kiểu nét vẽ hình khối (chỉ dùng cho shape)"
                }
              },
              required: ["type", "x", "y", "width", "height", "content"]
            }
          }
        },
        required: ["objects"]
      };

      const imagePart = {
        inlineData: {
          mimeType: "image/png",
          data: base64Data
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: `Hãy phân tích và chuyển đổi hình ảnh mẫu nhãn tem này thành thiết kế dạng đối tượng. Hãy bám sát kích thước nhãn là ${labelWidth}mm x ${labelHeight}mm.` }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });

      const resultText = response.text || "{}";
      const resultJson = JSON.parse(resultText);
      res.json(resultJson);
    } catch (error: any) {
      console.error("Gemini Analyze Error:", error);
      res.status(500).json({ error: error.message || "Có lỗi xảy ra khi phân tích hình ảnh." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
