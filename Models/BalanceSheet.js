const mongoose = require('mongoose');

// Define the Balance Sheet schema
const BalanceSheetSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    default: Date.now 
  },
  totalAssets: { 
    type: Number, 
    default: 0 
  },
  totalLiabilities: { 
    type: Number, 
    default: 0 
  },
  totalEquity: { 
    type: Number, 
    default: 0 
  },
  branch: { 
    type: String, 
    default: 'Main'  // You can set default or allow custom values for branch
  },
  assets: [{
    name: { 
      type: String, 
      required: true 
    },
    accountCode: { 
      type: String, 
      required: true 
    },
    balance: { 
      type: Number, 
      required: true 
    }
  }],
  liabilities: [{
    name: { 
      type: String, 
      required: true 
    },
    accountCode: { 
      type: String, 
      required: true 
    },
    balance: { 
      type: Number, 
      required: true 
    }
  }],
  equity: [{
    name: { 
      type: String, 
      required: true 
    },
    accountCode: { 
      type: String, 
      required: true 
    },
    balance: { 
      type: Number, 
      required: true 
    }
  }]
});

// Export the model based on the schema
module.exports = mongoose.model('BalanceSheet', BalanceSheetSchema);
