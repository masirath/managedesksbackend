const mongoose = require("mongoose");

const purchase_orders_payments_schema = mongoose.Schema({
  purchase: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "purchase_orders",
  },
  name: {
    required: true,
    type: String,
  },
  amount: {
    required: true,
    type: Number,
    default: 0,
  },
  status: {
    required: true,
    type: Number,
    default: 1,
  },
  ref: {
    required: true,
    type: Number,
  },
  branch: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "branches",
  },
  created: {
    required: true,
    type: Date,
  },
  created_by: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
});


// Add pre-save validation
purchase_orders_payments_schema.pre('save', async function(next) {
  // Validate payment amount
  if (this.amount <= 0) {
    this.invalidate('amount', 'Payment amount must be positive');
  }
  
  // Validate PO existence
  const po = await mongoose.model('purchase_orders').findById(this.purchase);
  if (!po || po.status === 2) {
    this.invalidate('purchase', 'Invalid purchase order');
  }
  
  next();
});


module.exports = mongoose.model(
  "purchase_orders_payments",
  purchase_orders_payments_schema,
  "purchase_orders_payments"
);
