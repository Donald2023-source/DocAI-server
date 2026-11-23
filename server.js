import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function getSupportedExtension(filename) {
  return filename.toLowerCase().split(".").pop();
}

async function extractText(file) {
  const extension = getSupportedExtension(file.originalname);

  if (["txt", "md", "csv", "json"].includes(extension)) {
    return file.buffer.toString("utf8");
  }

  if (extension === "pdf") {
    const parser = new PDFParse({ data: file.buffer });

    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  throw new Error("Unsupported file type");
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    endpoint: "POST /api/extract-text",
  });
});

app.post("/api/extract-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "A file is required" });
    }

    const text = await extractText(req.file);

    return res.json({
      filename: req.file.originalname,
      text,
    });
  } catch (error) {
    const status = error.message === "Unsupported file type" ? 415 : 500;

    return res.status(status).json({
      error:
        status === 415
          ? "Supported formats: PDF, DOCX, TXT, MD, CSV, and JSON"
          : "Text extraction failed",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Text extractor server running on http://localhost:${PORT}`);
});
