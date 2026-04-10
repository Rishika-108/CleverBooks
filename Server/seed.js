import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';

dotenv.config();

const seed = async () => {
   await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/courier-reconciliation');
   
   await Order.deleteMany({});
   
   const orders = [];
   const csvRows = ['awbNumber,batchId,settledCodAmount,chargedWeight,forwardCharge,rtoCharge,codHandlingFee,settlementDate'];
   
   const batchId = 'BATCH_' + Date.now();
   
   for (let i = 1; i <= 50; i++) {
      const awbNumber = `AWB${i.toString().padStart(5, '0')}`;
      const codAmount = Math.floor(Math.random() * 2000) + 500;
      const declaredWeight = +(Math.random() * 2 + 0.5).toFixed(2);
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() - Math.floor(Math.random() * 20));
      
      const order = {
         awbNumber,
         merchantId: 'M123',
         courierPartner: i % 2 === 0 ? 'Delhivery' : 'BlueDart',
         orderStatus: i % 10 === 0 ? 'RTO' : 'DELIVERED',
         codAmount,
         declaredWeight,
         orderDate: new Date(deliveryDate.getTime() - 3 * 24 * 60 * 60 * 1000),
         deliveryDate: i % 10 === 0 ? null : deliveryDate,
      };
      
      orders.push(order);
      
      let settledCodAmount = codAmount;
      let chargedWeight = declaredWeight;
      let rtoCharge = 0;
      
      if (i === 5) {
         settledCodAmount = codAmount - 50; 
      }
      if (i === 10) {
         chargedWeight = declaredWeight * 1.5; 
      }
      if (i === 15) {
         rtoCharge = 150;
      }
      
      let settlementDate = new Date().toISOString();
      if (i === 20) {
         order.deliveryDate = new Date();
         order.deliveryDate.setDate(new Date().getDate() - 16);
         settlementDate = '';
      }
      
      const forwardCharge = 50 + (chargedWeight * 10);
      const codHandlingFee = 20;
      
      csvRows.push(`${awbNumber},${batchId},${settledCodAmount},${chargedWeight},${forwardCharge},${rtoCharge},${codHandlingFee},${settlementDate}`);
   }
   
   await Order.insertMany(orders);
   console.log('Inserted 50 Orders.');
   
   fs.writeFileSync('./sample_settlement.csv', csvRows.join('\n'));
   console.log('Generated sample_settlement.csv');
   
   process.exit();
};

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
