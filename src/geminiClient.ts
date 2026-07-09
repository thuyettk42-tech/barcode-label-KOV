export async function callGeminiClientSide(
  image: string,
  labelWidth: number,
  labelHeight: number,
  apiKey: string
): Promise<{ thought_process: string; objects: any[] }> {
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
`;

  const responseSchema = {
    type: "OBJECT",
    properties: {
      thought_process: {
        type: "STRING",
        description: "Mô tả chi tiết quá trình giả lập hiển thị đối tượng lên kích thước tem thực tế, tính toán chiều cao/chiều rộng từng dòng, kiểm tra chống chồng chéo, căn cột thẳng hàng, tự hiệu chỉnh sai số tọa độ % để đạt độ khớp cao nhất."
      },
      objects: {
        type: "ARRAY",
        description: "Danh sách các phần tử thiết kế được nhận diện trên nhãn tem",
        items: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              enum: ["text", "barcode", "qrcode", "shape"],
              description: "Loại phần tử"
            },
            left_percent: {
              type: "NUMBER",
              description: "Khoảng cách từ mép trái ảnh gốc đến mép trái phần tử (0 đến 100 %)"
            },
            top_percent: {
              type: "NUMBER",
              description: "Khoảng cách từ mép trên ảnh gốc đến mép trên phần tử (0 đến 100 %)"
            },
            width_percent: {
              type: "NUMBER",
              description: "Chiều rộng phần tử so với chiều rộng ảnh gốc (0 đến 100 %)"
            },
            height_percent: {
              type: "NUMBER",
              description: "Chiều cao phần tử so với chiều cao ảnh gốc (0 đến 100 %)"
            },
            content: {
              type: "STRING",
              description: "Nội dung chữ, hoặc mã vạch, hoặc nội dung mã QR. Đối với shape thì để rỗng."
            },
            fontSize: {
              type: "NUMBER",
              description: "Cỡ chữ tính theo pt (chỉ dùng cho text, ví dụ: 6, 7, 8, 9, 10, 12)"
            },
            fontWeight: {
              type: "STRING",
              enum: ["normal", "bold"],
              description: "Độ đậm của chữ (chỉ dùng cho text)"
            },
            textAlign: {
              type: "STRING",
              enum: ["left", "center", "right"],
              description: "Căn lề chữ (chỉ dùng cho text)"
            },
            textFlowOrigin: {
              type: "STRING",
              enum: ["center", "center-left", "top-left", "top-center"],
              description: "Gốc định vị văn bản. Khuyên dùng 'center-left' cho căn trái, 'center' cho căn giữa."
            },
            barcodeFormat: {
              type: "STRING",
              enum: ["CODE128", "EAN13", "CODE39"],
              description: "Định dạng mã vạch (chỉ dùng cho barcode)"
            },
            displayValue: {
              type: "BOOLEAN",
              description: "Hiển thị chữ dưới mã vạch hay không (chỉ dùng cho barcode)"
            },
            barcodeWidth: {
              type: "NUMBER",
              description: "Độ rộng nét vẽ mã vạch (ví dụ 1.2, 1.4, 1.6, 2)"
            },
            barcodeHeight: {
              type: "NUMBER",
              description: "Chiều cao mã vạch bằng mm (chỉ dùng cho barcode)"
            },
            shapeType: {
              type: "STRING",
              enum: ["line", "rect", "circle", "oval"],
              description: "Loại hình khối (chỉ dùng cho shape)"
            },
            shapeStrokeWidth: {
              type: "NUMBER",
              description: "Độ dày nét vẽ hình khối bằng mm (chỉ dùng cho shape)"
            },
            shapeStrokeStyle: {
              type: "STRING",
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

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Data
            }
          },
          {
            text: `Hãy phân tích và chuyển đổi hình ảnh mẫu nhãn tem này thành thiết kế dạng đối tượng. Hãy bám sát kích thước nhãn là ${labelWidth}mm x ${labelHeight}mm.`
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: systemInstruction
        }
      ]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error (${res.status})`);
      }

      const resData = await res.json();
      const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) {
        throw new Error("Không nhận được nội dung từ phản hồi của Gemini.");
      }

      const resultJson = JSON.parse(resultText);

      // Perform coordinate mapping exactly like in server.ts
      if (resultJson && Array.isArray(resultJson.objects)) {
        resultJson.objects = resultJson.objects.map((obj: any, index: number) => {
          const left_percent = Number(obj.left_percent ?? 5);
          const top_percent = Number(obj.top_percent ?? 5);
          const width_percent = Number(obj.width_percent ?? 20);
          const height_percent = Number(obj.height_percent ?? 15);

          let original_width = (width_percent / 100) * labelWidth;
          let original_height = (height_percent / 100) * labelHeight;

          let left_mm = (left_percent / 100) * labelWidth;
          let top_mm = (top_percent / 100) * labelHeight;

          let width = original_width;
          let height = original_height;

          if (obj.type === "text") {
            const textContent = obj.content || "";
            const fontSize = obj.fontSize || (labelHeight <= 15 ? 7 : 8);
            const lines = textContent.split("\n");
            const linesCount = lines.length;
            const maxLineChars = Math.max(...lines.map((l: string) => l.length), 1);
            
            const charWidthEstimate = fontSize * 0.3528 * 0.52;
            const estimatedTextWidth = maxLineChars * charWidthEstimate + 1.2;
            
            width = Math.max(6, Math.min(original_width, estimatedTextWidth));
            
            const lineH = fontSize * 0.3528 * 1.25;
            const estimatedTextHeight = linesCount * lineH + 0.4;
            height = estimatedTextHeight;

            const textAlign = obj.textAlign || "left";
            if (textAlign === "right" || (obj.textFlowOrigin && obj.textFlowOrigin.includes("right"))) {
              const original_right_mm = left_mm + original_width;
              left_mm = original_right_mm - width;
            } else if (textAlign === "center") {
              const original_center_mm = left_mm + original_width / 2;
              left_mm = original_center_mm - width / 2;
            }
          }

          if (width < 2) width = 2;
          if (height < 1) height = 1;

          const safe_margin_mm = 0.5;
          const max_width_allowed = labelWidth - 2 * safe_margin_mm;
          const max_height_allowed = labelHeight - 2 * safe_margin_mm;

          if (width > max_width_allowed) width = max_width_allowed;
          if (height > max_height_allowed) height = max_height_allowed;

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

          if (obj.type === "qrcode") {
            const square_size = Math.min(width, height);
            left_mm = left_mm + (width - square_size) / 2;
            top_mm = top_mm + (height - square_size) / 2;
            width = square_size;
            height = square_size;
          }

          let barcodeHeight = obj.barcodeHeight;
          if (obj.type === "barcode") {
            if (width < 20) width = Math.min(max_width_allowed, 35);
            barcodeHeight = height - 3.0;
            if (barcodeHeight < 3.0) barcodeHeight = 3.0;
          }

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
            fontSize: obj.fontSize || (labelHeight <= 15 ? 7 : 8),
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

      return resultJson;
    } catch (err: any) {
      console.warn(`Direct client-side model ${modelName} failed:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Không thể kết nối đến API Gemini từ trình duyệt của bạn.");
}
