
// const mongoose = require("mongoose");

// const GRNDetailSchema = new mongoose.Schema(
//   {
//     product_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: false,
//     },
//     product_name: {
//       type: String,
//       required: false,
//     },
//     received_quantity: {
//       type: Number,
//       required: true,
//       min: 1,
//     },
//     damaged_quantity: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },
//     unit_price: {
//       type: Number,
//       required: true,
//       min: 0.01,
//     },
//     total_value: {
//       type: Number,
//       required: false,
//       min: 0,
//     },
//     barcode: {
//       type: String,
//       default: "",
//     },
//     remarks: {
//       type: String,
//       default: "",
//     },
//   },
//   { _id: false }
// );

// // Add cross-field validation
// GRNDetailSchema.path("product_id").validate(function (value) {
//   const detail = this;
//   if (!detail.product_id && !detail.product_name) {
//     throw new Error("Either product_id or product_name must be provided.");
//   }
//   return true;
// });

// const GRNSchema = new mongoose.Schema(
//   {
//     grn_number: {
//       type: String,
//       required: true,
//       validate: {
//         validator: function (v) {
//           return /^GRN-[A-Za-z0-9-]+$/.test(v);
//         },
//         message: (props) => `${props.value} is not a valid GRN number format!`,
//       },
//     },
//     grn_date: {
//       type: Date,
//       required: true,
//     },
//     received_by: {
//       type: String,
//       required: true,
//     },
//     notes: {
//       type: String,
//       default: "",
//     },
//     branch: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Branch",
//       required: true,
//     },
//     created_by: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["Received", "Pending", "Cancelled"],
//       default: "Pending",
//     },
//     total_received: {
//       type: Number,
//       required: true,
//       default: 0,
//     },
//     grn_details: [GRNDetailSchema],
//   },
//   { timestamps: true }
// );

// // Pre-save hook to calculate total_value for each item and total_received
// GRNSchema.pre("save", function (next) {
//   // Calculate total_value for each GRN detail
//   this.grn_details.forEach((detail) => {
//     detail.total_value =
//       parseFloat(detail.received_quantity) *
//       parseFloat(detail.unit_price || 0);
//   });

//   // Calculate total_received from sum of all item values
//   this.total_received = this.grn_details.reduce(
//     (sum, detail) => sum + detail.total_value,
//     0
//   );

//   next();
// });

// // Ensure uniqueness on grn_number
// GRNSchema.index({ grn_number: 1 }, { unique: true });

// module.exports = mongoose.model("GRN", GRNSchema);




//new model for supplier with Po

/*
const mongoose = require("mongoose");

const GRNDetailSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    product_name: {
      type: String,
      required: false,
    },
    received_quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    damaged_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0.01,
    },
    total_value: {
      type: Number,
      required: false,
      min: 0,
    },
    barcode: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Add cross-field validation
GRNDetailSchema.path("product_id").validate(function (value) {
  const detail = this;
  if (!detail.product_id && !detail.product_name) {
    throw new Error("Either product_id or product_name must be provided.");
  }
  return true;
});

const GRNSchema = new mongoose.Schema(
  {
    grn_number: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^GRN-[A-Za-z0-9-]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid GRN number format!`,
      },
    },
    grn_date: {
      type: Date,
      required: true,
    },
    received_by: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Received", "Pending", "Cancelled"],
      default: "Pending",
    },
    total_received: {
      type: Number,
      required: true,
      default: 0,
    },
    purchase_order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: false,
    },
    grn_details: [GRNDetailSchema],
  },
  { timestamps: true }
);

// Pre-save hook to calculate total_value for each item and total_received
GRNSchema.pre("save", function (next) {
  this.grn_details.forEach((detail) => {
    detail.total_value =
      parseFloat(detail.received_quantity) *
      parseFloat(detail.unit_price || 0);
  });

  this.total_received = this.grn_details.reduce(
    (sum, detail) => sum + detail.total_value,
    0
  );

  next();
});

GRNSchema.index({ grn_number: 1 }, { unique: true });

module.exports = mongoose.model("GRN", GRNSchema);


*/



const mongoose = require("mongoose");
const Supplier = require("../Models/suppliers")
// Sub-schema for GRN details
const GRNDetailSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    product_name: {
      type: String,
      required: false,
    },
    received_quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    damaged_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0.01,
    },
    total_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    barcode: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Add cross-field validation
GRNDetailSchema.path("product_id").validate(function (value) {
  const detail = this;
  if (!detail.product_id && !detail.product_name) {
    throw new Error("Either product_id or product_name must be provided.");
  }
  return true;
});

// Main GRN schema
const GRNSchema = new mongoose.Schema(
  {
    grn_number: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^GRN-[A-Za-z0-9-]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid GRN number format!`,
      },
    },
    grn_date: {
      type: Date,
      required: true,
    },
    received_by: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Received", "Pending", "Cancelled"],
      default: "Pending",
    },
    total_received: {
      type: Number,
      required: true,
      default: 0,
    },
    purchase_order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: false,
    },
    purchase_order_number: {
      type: String,
      required: false,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "suppliers",
      required: true,
    },
    grn_details: [GRNDetailSchema],
  }, 

  
  { timestamps: true }
);

// Pre-save hook to calculate total_value for each item and total_received
GRNSchema.pre("save", function (next) {
  try {
    // Calculate total_value for each GRN detail
    this.grn_details.forEach((detail) => {
      detail.total_value =
        parseFloat(detail.received_quantity || 0) *
        parseFloat(detail.unit_price || 0);
    });

    // Calculate total_received from the sum of all item values
    this.total_received = this.grn_details.reduce(
      (sum, detail) => sum + (detail.total_value || 0),
      0
    );

    next();
  } catch (error) {
    console.error("Error in pre-save hook:", error.message);
    next(error);
  }
});

// Ensure uniqueness on grn_number
GRNSchema.index({ grn_number: 1 }, { unique: true });

module.exports = mongoose.model("GRN", GRNSchema);