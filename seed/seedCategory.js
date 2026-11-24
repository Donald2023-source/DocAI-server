import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const Category = mongoose.models.Category
  ? mongoose.models.Category
  : mongoose.model("Category", categorySchema);

const seedCategories = [
  { name: "Academic" },
  { name: "Payments & Finance" },
  { name: "Identity & Verification" },
  { name: "Legal & Compliance" },
  { name: "Employment & HR" },
  { name: "Administrative" },
  { name: "Medical & Health" },
  { name: "Business & Corporate" },
];

async function seedDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  await Category.bulkWrite(
    seedCategories.map(({ name }) => ({
      updateOne: {
        filter: { name },
        update: { $setOnInsert: { name } },
        upsert: true,
      },
    })),
  );

  console.log("DocAI categories added successfully");
}

seedDatabase()
  .catch((error) => {
    console.error("Category seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
