import { Schema, model, models, type Model } from "mongoose";

/**
 * Atomic named counters, used to generate gap-free sequential order numbers
 * (`GFT-YYYY-XXXXX`, PRD §17.7). Keyed per year, e.g. `_id: "order-2026"`.
 * `findByIdAndUpdate` with `$inc` + `upsert` is atomic, so concurrent order
 * creations never collide on a sequence value.
 *
 * `_id` is a plain string here, so the interface intentionally does not extend
 * `Document` (whose `_id` is an ObjectId).
 */
export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter: Model<ICounter> =
  models.Counter || model<ICounter>("Counter", CounterSchema);

export default Counter;

/** Atomically increment and return the next value for `key`. */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc ? doc.seq : 1;
}
