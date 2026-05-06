import mongoose, { Document, Schema } from "mongoose";

interface ICategorySummary {
  categoryId: mongoose.Types.ObjectId;
  categoryName: string;
  totalCents: number;
  count: number;
}

export interface IMonthlySummary extends Document {
  userId: mongoose.Types.ObjectId;
  year: number;
  month: number;
  totalCents: number;
  expenseCount: number;
  byCategory: ICategorySummary[];
  updatedAt: Date;
}

const CategorySummarySchema = new Schema<ICategorySummary>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    categoryName: { type: String, required: true },
    totalCents: { type: Number, required: true },
    count: { type: Number, required: true },
  },
  { _id: false }
);

const MonthlySummarySchema = new Schema<IMonthlySummary>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  totalCents: { type: Number, required: true },
  expenseCount: { type: Number, required: true },
  byCategory: { type: [CategorySummarySchema], default: [] },
  updatedAt: { type: Date, required: true },
});

MonthlySummarySchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export const MonthlySummary =
  (mongoose.models.MonthlySummary as mongoose.Model<IMonthlySummary>) ||
  mongoose.model<IMonthlySummary>("MonthlySummary", MonthlySummarySchema);
