import { Schema, model, models, type Model, type Document, type Types } from "mongoose";

export interface IProduct extends Document {
  title: string;
  slug: string;
  description: string;
  price: number; // smallest currency unit (paise)
  comparePrice?: number;
  images: string[]; // Cloudinary URLs, max 6
  category: Types.ObjectId;
  stock: number;
  published: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0 },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 6,
        message: "A product can have at most 6 images.",
      },
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    stock: { type: Number, default: 0, min: 0 },
    published: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compound indexes for the hot storefront list queries (V1.1 perf audit): the
// catalogue always filters on `published`, then sorts by recency or price, or
// narrows by category. These let those reads use an index instead of a scan.
ProductSchema.index({ published: 1, createdAt: -1 });
ProductSchema.index({ published: 1, price: 1 });
ProductSchema.index({ published: 1, category: 1 });

const Product: Model<IProduct> =
  models.Product || model<IProduct>("Product", ProductSchema);

export default Product;
