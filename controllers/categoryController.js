import mongoose from "mongoose";
import Category from "../models/Category.js";

export const getCategories = async (req, res) => {
  const filter = {};
  const wantsAll = req.query.all === "true" && req.user?.role === "admin";
  if (!wantsAll) filter.isActive = true;

  const categories = await Category.find(filter).sort({ name: 1 });
  res.json({ count: categories.length, categories });
};

export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json(category);
};

export const createCategory = async (req, res) => {
  const { name, description } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const category = await Category.create({ name, description });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A category with that name already exists" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    throw err;
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  const { name, description, isActive } = req.body ?? {};
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  try {
    await category.save();
    res.json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A category with that name already exists" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    throw err;
  }
};

// Soft delete: hides the category instead of removing it
export const deactivateCategory = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }

  const category = await Category.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json({ message: "Category deactivated", category });
};