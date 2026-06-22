import { Schema, model, models, type Model, type Document } from "mongoose";

/**
 * Singleton store configuration (PRD §Phase 5). Exactly one document exists,
 * keyed by `key: "store"`; the admin settings page reads and upserts it.
 * Money fields (shipping) are integer paise like everywhere else (PRD §7).
 */
export interface ISettings extends Document {
  key: string;
  storeName: string;
  logoUrl: string;
  contactEmail: string;
  currency: string;
  shippingFee: number; // paise, flat fee added at checkout
  freeShippingThreshold: number; // paise, 0 = always charge shipping
  social: {
    instagram: string;
    twitter: string;
    facebook: string;
  };
}

const SettingsSchema = new Schema<ISettings>({
  key: { type: String, required: true, unique: true, default: "store" },
  storeName: { type: String, default: "Giftopia", trim: true },
  logoUrl: { type: String, default: "" },
  contactEmail: { type: String, default: "", trim: true },
  currency: { type: String, default: "INR", trim: true },
  shippingFee: { type: Number, default: 0, min: 0 },
  freeShippingThreshold: { type: Number, default: 0, min: 0 },
  social: {
    instagram: { type: String, default: "" },
    twitter: { type: String, default: "" },
    facebook: { type: String, default: "" },
  },
});

const Settings: Model<ISettings> =
  models.Settings || model<ISettings>("Settings", SettingsSchema);

export default Settings;
