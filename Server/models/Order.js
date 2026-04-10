import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  awbNumber: { type: String, required: true, unique: true, index: true },
  merchantId: { type: String, required: true },
  courierPartner: { type: String, required: true },
  orderStatus: { type: String, enum: ['DELIVERED', 'RTO', 'IN_TRANSIT', 'LOST'], required: true },
  codAmount: { type: Number, required: true },
  declaredWeight: { type: Number, required: true },
  orderDate: { type: Date, required: true },
  deliveryDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
