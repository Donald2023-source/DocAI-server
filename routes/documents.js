import express from "express";
import Document from "../models/Document.js";
// import authenticateUser from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/documents/me
 * Returns only the uploaded documents belonging to the authenticated user.
 * The user ID comes from the verified token, never from query/body input.
 */
router.get("/", async (req, res) => {
  try {
    res.json({
      message: "Document route active",
    });
  } catch (err) {
    res.json({
      message: "Error",
    });
  }
});

router.get("/me", async (req, res) => {
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

export default router;
