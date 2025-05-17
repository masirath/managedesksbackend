/**
 * Calculate subtotal, VAT, and total amount for a voucher
 * @param {Array} items - Array of item objects
 * @returns {Object} - { subTotal, vatTotal, totalAmount, vatSummary }
 */
const calculateVoucher = (items) => {
    let subTotal = 0;
    let vatTotal = 0;
    const vatSummary = {};
  
    for (const item of items) {
      const amount = item.quantity * item.unitPrice;
      subTotal += amount;
  
      const vatAmount = (amount * item.vatRate) / 100;
      vatTotal += vatAmount;
  
      if (!vatSummary[item.vatRate]) {
        vatSummary[item.vatRate] = 0;
      }
      vatSummary[item.vatRate] += vatAmount;
    }
  
    const totalAmount = subTotal + vatTotal;
  
    return { subTotal, vatTotal, totalAmount, vatSummary };
  };
  
  /**
   * Extract bill-by-bill adjustment data from items
   * @param {Array} items - Array of item objects
   * @returns {Array} - Array of bill adjustments (if any)
   */
  const extractBillAdjustments = (items) => {
    const adjustments = [];
  
    for (const item of items) {
      if (item.billReference && item.adjustedAmount > 0) {
        adjustments.push({
          billReference: item.billReference,
          adjustedAmount: item.adjustedAmount,
        });
      }
    }
  
    return adjustments;
  };
  
  // ✅ Clean structured export
  module.exports = {
    calculateVoucher,
    extractBillAdjustments,
  };
  