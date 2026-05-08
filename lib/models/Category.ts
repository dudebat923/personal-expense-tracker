import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId | null;
  name: string;
  isDefault: boolean;
}

const CategorySchema = new Schema<ICategory>({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  name: { type: String, required: true },
  isDefault: { type: Boolean, required: true, default: false },
});

CategorySchema.index({ userId: 1 });
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const Category =
  (mongoose.models.Category as mongoose.Model<ICategory>) ||
  mongoose.model<ICategory>("Category", CategorySchema);
