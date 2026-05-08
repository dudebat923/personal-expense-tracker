import mongoose, { Document, Schema } from "mongoose";

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  amountCents: number;
  description?: string;
  date: Date;
  type: "expense" | "income";
}

const ExpenseSchema = new Schema<IExpense>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  amountCents: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  type: { type: String, enum: ["expense", "income"], default: "expense" },
});

ExpenseSchema.index({ userId: 1 });
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, categoryId: 1, date: -1 });

export const Expense =
  (mongoose.models.Expense as mongoose.Model<IExpense>) ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);
