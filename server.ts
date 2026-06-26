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
Bạn là một kỹ sư thị giác máy tính và chuyên gia thiết kế đồ họa cao cấp, chuyên phân tích hình ảnh nhãn dán, tem sản phẩm, mã vạch (barcode) và mã QR để bóc tách các đối tượng thiết kế với độ chính xác cực cao (từng điểm point và pixel, đạt độ khớp trên 95% so với ảnh mẫu).

KÍCH THƯỚC KHỔ GIẤY IN THỰC TẾ MÀ NGƯỜI DÙNG CHỌN (BẮT BUỘC KHỚP TỈ LỆ VÀO KHỔ NÀY):
- Chiều rộng nhãn: W = ${labelWidth} mm.
- Chiều cao nhãn: H = ${labelHeight} mm.

⚠️ QUY TRÌNH PHÂN TÍCH 3 BƯỚC BẮT BUỘC ĐỂ GIẢ LẬP VÀ HIỆU CHỈNH (MÔ PHỎNG LÊN TRƯỚC):
Bước 1: Nhận diện ranh giới Nhãn thực tế (Label Area Localization):
  - Rất nhiều ảnh mẫu có viền trống (margin) hoặc nền chụp xung quanh. Hãy xác định vùng biên thực tế của chiếc tem nhãn trong ảnh mẫu.
  - Toàn bộ các tọa độ %, kích thước % của các đối tượng PHẢI được tính toán tương đối dựa trên ranh giới thực tế của chiếc tem nhãn đó, chứ không phải dựa trên ranh giới toàn bộ bức ảnh! Điều này loại bỏ hoàn toàn hiện tượng lệch lề hay biến dạng kích thước do viền ảnh trống xung quanh.

Bước 2: Giả lập vị trí và Tính toán kích thước bằng Công thức Vật lý (Mathematical Physical Simulation):
  - Bạn phải chuyển đổi kích thước hiển thị vật lý thành hệ tọa độ phần trăm (%) trên khổ tem thực tế W = ${labelWidth}mm, H = ${labelHeight}mm.
  - Hãy áp dụng chính xác các công thức vật lý sau để tính toán kích thước phần tử:
    1. CHIỀU CAO VĂN BẢN (Text Height):
       - Chiều cao thực tế của ký tự chữ có cỡ chữ fontSize (pt): H_char = fontSize * 0.3528 (mm) (vì 1pt = 0.3528mm).
       - Dòng văn bản cần có chiều cao dòng tiêu chuẩn (line-height = 1.25) cộng lề đệm trên dưới (padding = 0.4mm):
         H_text = (số_dòng_chữ) * fontSize * 0.3528 * 1.25 + 0.4 (mm)
       - Từ đó, tính ra tỉ lệ chiều cao phần trăm:
         height_percent = (H_text / ${labelHeight}) * 100
       - CỰC KỲ QUAN TRỌNG: Trên nhãn dẹt H = 12mm, dòng chữ 7pt cần H_text ≈ 3.5mm, tức height_percent ≈ 29.1%. Không được đặt nhỏ hơn 25% vì chữ sẽ bị tràn khung, đè dính nhau!
    2. CHIỀU RỘNG VĂN BẢN (Text Width):
       - Chiều rộng trung bình của một ký tự chữ tỉ lệ với fontSize là: W_char = fontSize * 0.3528 * 0.52 (mm).
       - Chiều rộng tổng cộng của dòng chữ có N ký tự (lấy độ dài dòng dài nhất) cộng thêm lề đệm (padding = 1.2mm):
         W_text = N * fontSize * 0.3528 * 0.52 + 1.2 (mm)
       - Từ đó, tính ra tỉ lệ chiều rộng phần trăm:
         width_percent = (W_text / ${labelWidth}) * 100
       - VÍ DỤ: Chữ "Tên hàng hóa" (12 ký tự), fontSize = 7pt trên nhãn rộng 85mm:
         W_text = 12 * 7 * 0.3528 * 0.52 + 1.2 = 16.6 mm. width_percent = (16.6 / 85) * 100 ≈ 19.5%. Nhất định KHÔNG được trả ra các giá trị khổng lồ như 40% - 50%, vì như vậy hộp chữ sẽ quá to và đè dính lên các đối tượng khác ở bên phải!
    3. MÃ VẠCH (Barcode):
       - Mã vạch cần đủ rộng để máy quét đọc được: width_percent nên từ 30% đến 45% chiều rộng nhãn.
       - Chiều cao mã vạch (bao gồm cả chữ số bên dưới) nên chiếm khoảng 50% đến 65% chiều cao nhãn đối với nhãn dẹp (H <= 15mm), hoặc 35% đến 45% đối với nhãn vuông.
    4. MÃ QR CODE:
       - QR Code luôn có dạng hình vuông tuyệt đối (tỉ lệ 1:1 vật lý). Do đó, hãy luôn đảm bảo:
         width_percent * W = height_percent * H  =>  width_percent = height_percent * (H / W)

Bước 3: Hiệu chỉnh Va chạm & Căn hàng tắp lề (Collision Prevention & Grid Alignment):
  - TRÁNH CHỒNG CHÉO DỌC (Vertical Line Spacing): Nếu xếp các dòng chữ chồng lên nhau theo chiều dọc, dòng dưới phải cách dòng trên ít nhất (height_percent của dòng trên + 4% đến 6% khoảng cách).
    Ví dụ: Dòng 1 có top_percent = 8% và height_percent = 29%. Thì dòng 2 PHẢI có top_percent tối thiểu là: 8% + 29% + 5% = 42%! Nếu đặt nhỏ hơn (ví dụ dòng 2 có top_percent = 20%), các dòng chữ sẽ dính chồng lên nhau hoàn toàn.
  - CANH CỘT THẲNG HÀNG (Vertical Alignment): Các dòng chữ xếp thành một cột dọc (ví dụ các dòng bên trái) PHẢI CÓ CÙNG GIÁ TRỊ "left_percent" hoàn hảo (ví dụ cùng bằng 4%) để thẳng tắp.
  - CANH HÀNG NGANG (Horizontal Alignment): Các đối tượng nằm trên cùng hàng ngang (ví dụ tên hàng bên trái, mã vạch hoặc giá bên phải) PHẢI CÓ CÙNG GIÁ TRỊ "top_percent" hoàn hảo để song song tuyệt đối.

⚠️ QUY TẮC PHÒNG TRÀN BIÊN (Safe Margins):
- Không đặt đối tượng nào sát sạt mép viền nhãn dán. Luôn để trống ít nhất 3% ở lề Trái, Phải, Trên, Dưới. Tức là:
  + left_percent >= 3%
  + left_percent + width_percent <= 97%
  + top_percent >= 3%
  + top_percent + height_percent <= 97%

CÁC PHẦN TỬ VÀ THÔNG SỐ:
1. "text":
   - content: Văn bản thực tế xuất hiện trong ảnh nhãn.
   - fontWeight: "bold" hoặc "normal".
   - textAlign: "left", "center", "right".
   - textFlowOrigin: "center-left" cho chữ căn trái, "center" cho chữ căn giữa.
   - fontSize: Cỡ chữ từ 6 đến 14 pt (mặc định nên là 7 hoặc 8 cho tem dẹt cực kỳ nhỏ).
2. "barcode" (Mã vạch):
   - content: Giá trị mã vạch (ví dụ: "SP-2026-A1").
   - barcodeFormat: "CODE128", "EAN13", hoặc "CODE39".
   - displayValue: Luôn để true.
3. "shape" (Đường kẻ, hình khối):
   - shapeType: "line" (nếu là đường kẻ), "rect" (khung viền).
   - shapeStrokeWidth: Độ dày nét (0.5 đến 1.5).
   - shapeStrokeStyle: "solid", "dashed", "dotted".

YÊU CẦU ĐẦU RA:
Bạn phải trình bày chi tiết từng bước tính toán nhẩm vật lý, ước lượng chiều rộng, chiều cao bằng mm, tỷ lệ khung hình và cách hiệu chỉnh chống chồng chéo, căn thẳng hàng của bạn trong trường "thought_process" bằng tiếng Việt trước khi xuất ra mảng "objects".
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          thought_process: {
            type: Type.STRING,
            description: "Mô tả chi tiết quá trình giả lập hiển thị đối tượng lên kích thước tem thực tế, tính toán chiều cao/chiều rộng từng dòng, kiểm tra chống chồng chéo, căn cột thẳng hàng, tự hiệu chỉnh sai số tọa độ % để đạt độ khớp cao nhất."
          },
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
                left_percent: {
                  type: Type.NUMBER,
                  description: "Khoảng cách từ mép trái ảnh gốc đến mép trái phần tử (0 đến 100 %)"
                },
                top_percent: {
                  type: Type.NUMBER,
                  description: "Khoảng cách từ mép trên ảnh gốc đến mép trên phần tử (0 đến 100 %)"
                },
                width_percent: {
                  type: Type.NUMBER,
                  description: "Chiều rộng phần tử so với chiều rộng ảnh gốc (0 đến 100 %)"
                },
                height_percent: {
                  type: Type.NUMBER,
                  description: "Chiều cao phần tử so với chiều cao ảnh gốc (0 đến 100 %)"
                },
                content: {
                  type: Type.STRING,
                  description: "Nội dung chữ, hoặc mã vạch, hoặc nội dung mã QR. Đối với shape thì để rỗng."
                },
                fontSize: {
                  type: Type.NUMBER,
                  description: "Cỡ chữ tính theo pt (chỉ dùng cho text, ví dụ: 6, 7, 8, 9, 10, 12)"
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
                  description: "Gốc định vị văn bản. Khuyên dùng 'center-left' cho căn trái, 'center' cho căn giữa."
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
              required: ["type", "left_percent", "top_percent", "width_percent", "height_percent", "content"]
            }
          }
        },
        required: ["thought_process", "objects"]
      };

      const imagePart = {
        inlineData: {
          mimeType: "image/png",
          data: base64Data
        }
      };

      // Attempt generation with robust model fallbacks to bypass temporary 503 (UNAVAILABLE) or 429 (RESOURCE_EXHAUSTED) errors
      // Prefer the highly optimized gemini-3.5-flash first for blistering fast speed (~2-3s)
      const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`[AI] Attempting label analysis using model: ${modelName}`);
          const res = await ai.models.generateContent({
            model: modelName,
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
          if (res) {
            response = res;
            console.log(`[AI] Successfully analyzed label using model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[AI] Model ${modelName} failed:`, err.message || err);
          lastError = err;
          // Continue to next fallback model in the list
        }
      }

      if (!response) {
        throw lastError || new Error("Tất cả các mô hình AI của Google hiện tại đều đang bận hoặc hết hạn ngạch. Vui lòng thử lại hoặc dán API Key cá nhân của bạn.");
      }

      const resultText = response.text || "{}";
      const resultJson = JSON.parse(resultText);

      // Map the percentage-based output of the AI to the millimeter center-relative coordinate system expected by the editor
      if (resultJson && Array.isArray(resultJson.objects)) {
        resultJson.objects = resultJson.objects.map((obj: any, index: number) => {
          const left_percent = Number(obj.left_percent ?? 5);
          const top_percent = Number(obj.top_percent ?? 5);
          const width_percent = Number(obj.width_percent ?? 20);
          const height_percent = Number(obj.height_percent ?? 15);

          // Convert percentage to actual millimeter dimensions based on user's configured label dimensions
          let original_width = (width_percent / 100) * labelWidth;
          let original_height = (height_percent / 100) * labelHeight;

          let left_mm = (left_percent / 100) * labelWidth;
          let top_mm = (top_percent / 100) * labelHeight;

          let width = original_width;
          let height = original_height;

          // Apply Intelligent Layout Optimization for text blocks to prevent overlapping & bloating
          if (obj.type === "text") {
            const textContent = obj.content || "";
            const fontSize = obj.fontSize || (labelHeight <= 15 ? 7 : 8);
            const lines = textContent.split("\n");
            const linesCount = lines.length;
            const maxLineChars = Math.max(...lines.map(l => l.length), 1);
            
            // 1pt approx = 0.3528mm. Typical character aspect ratio is ~0.52.
            const charWidthEstimate = fontSize * 0.3528 * 0.52;
            const estimatedTextWidth = maxLineChars * charWidthEstimate + 1.2;
            
            // Tightly fit width to actual text content
            width = Math.max(6, Math.min(original_width, estimatedTextWidth));
            
            // Fit height to actual text content height (line-height 1.25 on canvas)
            const lineH = fontSize * 0.3528 * 1.25;
            const estimatedTextHeight = linesCount * lineH + 0.4;
            height = estimatedTextHeight;

            // Preserve alignment anchor edge to keep columns perfectly straight
            const textAlign = obj.textAlign || "left";
            if (textAlign === "right" || (obj.textFlowOrigin && obj.textFlowOrigin.includes("right"))) {
              // Keep the right edge fixed
              const original_right_mm = left_mm + original_width;
              left_mm = original_right_mm - width;
            } else if (textAlign === "center") {
              // Keep the center point fixed
              const original_center_mm = left_mm + original_width / 2;
              left_mm = original_center_mm - width / 2;
            } else {
              // "left" alignment: keep left edge fixed
            }

            // Top-align provides the most robust horizontal alignment for multiple columns
            // so we do not shift top_mm vertically.
          }

          // Prevent objects from being completely zero or microscopic
          if (width < 2) width = 2;
          if (height < 1) height = 1;

          // Enforce bounds with safe margin (0.5mm from edges)
          const safe_margin_mm = 0.5;
          const max_width_allowed = labelWidth - 2 * safe_margin_mm;
          const max_height_allowed = labelHeight - 2 * safe_margin_mm;

          if (width > max_width_allowed) width = max_width_allowed;
          if (height > max_height_allowed) height = max_height_allowed;

          // Clamp position within safe margin boundaries
          if (left_mm < safe_margin_mm) {
            left_mm = safe_margin_mm;
          }
          if (left_mm + width > labelWidth - safe_margin_mm) {
            left_mm = labelWidth - safe_margin_mm - width;
          }

          if (top_mm < safe_margin_mm) {
            top_mm = safe_margin_mm;
          }
          if (top_mm + height > labelHeight - safe_margin_mm) {
            top_mm = labelHeight - safe_margin_mm - height;
          }

          // Special logic for QR Code to maintain 1:1 aspect ratio
          if (obj.type === "qrcode") {
            const square_size = Math.min(width, height);
            left_mm = left_mm + (width - square_size) / 2;
            top_mm = top_mm + (height - square_size) / 2;
            width = square_size;
            height = square_size;
          }

          // Special logic for barcode height to prevent giant vertical barcodes
          let barcodeHeight = obj.barcodeHeight;
          if (obj.type === "barcode") {
            if (width < 20) width = Math.min(max_width_allowed, 35);
            barcodeHeight = height - 3.0; // reserve 3.0mm for text below barcode
            if (barcodeHeight < 3.0) barcodeHeight = 3.0;
          }

          // Convert top-left (left_mm, top_mm) to center-relative (x, y)
          const center_x_tl = left_mm + width / 2;
          const center_y_tl = top_mm + height / 2;

          const x = center_x_tl - labelWidth / 2;
          const y = center_y_tl - labelHeight / 2;

          return {
            id: `ai-obj-${Date.now()}-${index}`,
            type: obj.type,
            x: Number(x.toFixed(1)),
            y: Number(y.toFixed(1)),
            width: Number(width.toFixed(1)),
            height: Number(height.toFixed(1)),
            content: obj.content || "",
            fontSize: obj.fontSize || (labelHeight <= 15 ? 7 : 8), // adapt default fontSize based on height
            fontWeight: obj.fontWeight || "normal",
            textAlign: obj.textAlign || "left",
            textFlowOrigin: obj.textFlowOrigin || (obj.textAlign === "center" ? "center" : "center-left"),
            fontFamily: "Inter",
            color: "#000000",
            barcodeFormat: obj.barcodeFormat || "CODE128",
            displayValue: obj.displayValue !== false,
            barcodeWidth: obj.barcodeWidth || 1.5,
            barcodeHeight: barcodeHeight ? Number(barcodeHeight.toFixed(1)) : undefined,
            shapeType: obj.shapeType,
            shapeStrokeWidth: obj.shapeStrokeWidth,
            shapeStrokeStyle: obj.shapeStrokeStyle
          };
        });
      }

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
