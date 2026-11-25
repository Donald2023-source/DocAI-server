import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import Document from "../models/Document.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const uploadDirectory = fileURLToPath(
  new URL("../storage/documents/", import.meta.url),
);
const allowedTypes = new Map([
  [".pdf", new Set(["application/pdf"])],
  [
    ".docx",
    new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
  ],
  [".txt", new Set(["text/plain"])],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdir(uploadDirectory, { recursive: true })
        .then(() => callback(null, uploadDirectory))
        .catch(callback);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeTypes = allowedTypes.get(extension);
    callback(null, Boolean(mimeTypes && mimeTypes.has(file.mimetype)));
  },
});

router.get("/", (_req, res) => {
  res.json({ message: "Document route active" });
});

router.post("/", protect, (req, res, next) => {
  upload.single("document")(req, res, async (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    if (error) {
      return next(error);
    }
    if (!req.file) {
      return res.status(400).json({
        message: "Upload one PDF, DOCX, or TXT file (maximum 10 MB).",
      });
    }

    try {
      const document = new Document({
        userId: req.user.id,
        fileName: path.basename(req.file.originalname),
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      document.fileUrl = `/api/documents/${document.id}/file`;
      await document.save();

      return res.status(201).json({
        message: "Document uploaded successfully",
        document: {
          _id: document.id,
          userId: document.userId,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          mimeType: document.mimeType,
          size: document.size,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      });
    } catch (saveError) {
      try {
        await unlink(req.file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Failed to remove an unrecorded uploaded document:", cleanupError);
        }
      }
      console.error("POST /api/documents failed:", saveError);
      return res.status(500).json({ message: "Failed to save document" });
    }
  });
});

router.get("/me", protect, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id })
      .select("_id userId fileName fileUrl mimeType size createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Documents retrieved successfully",
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error("GET /api/documents/me failed:", error);
    return res.status(500).json({ message: "Failed to retrieve documents" });
  }
});

router.get("/:id/file", protect, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.download(document.storagePath, document.fileName, (error) => {
      if (error && !res.headersSent) {
        console.error("GET /api/documents/:id/file failed:", error);
        res.status(500).json({ message: "Failed to retrieve document" });
      }
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Document not found" });
    }
    console.error("GET /api/documents/:id/file failed:", error);
    return res.status(500).json({ message: "Failed to retrieve document" });
  }
});

export default router;
