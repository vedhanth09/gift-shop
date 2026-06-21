import { Schema, model, models, type Model, type Document, type Types } from "mongoose";

export interface IAddress {
  label: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

export interface ICartItem {
  productId: Types.ObjectId;
  qty: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // bcrypt hashed
  role: "customer" | "admin";
  /** Whether the customer has confirmed their email (V1.1). */
  emailVerified: boolean;
  addresses: IAddress[]; // max 5
  wishlist: Types.ObjectId[];
  cart: ICartItem[]; // server copy, synced from the client cart on login
  // One-time token hashes (raw tokens are emailed, never stored). `select: false`
  // keeps them out of normal reads; redemption queries opt back in.
  verifyTokenHash?: string;
  verifyTokenExpires?: Date;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  emailVerified: { type: Boolean, default: false },
  verifyTokenHash: { type: String, select: false, index: { sparse: true } },
  verifyTokenExpires: { type: Date, select: false },
  resetTokenHash: { type: String, select: false, index: { sparse: true } },
  resetTokenExpires: { type: Date, select: false },
  addresses: {
    type: [AddressSchema],
    default: [],
    validate: {
      validator: (v: IAddress[]) => v.length <= 5,
      message: "A user can save at most 5 addresses.",
    },
  },
  wishlist: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
  cart: { type: [CartItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);

export default User;
