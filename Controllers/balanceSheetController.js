const Account = require("../Models/Account");
const { authorization } = require("../Global/authorization");

const getBalanceSheetData = async (req, res) => {

   // Check for authorization
   const authorize = authorization(req);
   if (!authorize) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { date } = req.query;
  try {
    // Fetch all accounts grouped by category (Assets, Liabilities, Equity)
    const assets = await Account.find({ category: "Assets", balance: { $gte: 0 } });
    const liabilities = await Account.find({ category: "Liabilities", balance: { $gte: 0 } });
    const equity = await Account.find({ category: "Equity", balance: { $gte: 0 } });

    // Log the results for debugging
    console.log("Assets:", assets);
    console.log("Liabilities:", liabilities);
    console.log("Equity:", equity);

    // Calculate the total balance for each category
    const totalAssets = assets.length > 0 ? assets.reduce((sum, account) => sum + account.balance, 0) : 0;
    const totalLiabilities = liabilities.length > 0 ? liabilities.reduce((sum, account) => sum + account.balance, 0) : 0;
    const totalEquity = equity.length > 0 ? equity.reduce((sum, account) => sum + account.balance, 0) : 0;

    // Log the totals to ensure they are calculated correctly
    console.log("Total Assets:", totalAssets);
    console.log("Total Liabilities:", totalLiabilities);
    console.log("Total Equity:", totalEquity);

    // Return the response with the calculated data
    return res.status(200).json({
      success: true,
      assets,
      liabilities,
      equity,
      totalAssets: parseFloat(totalAssets), // Return total as a number
      totalLiabilities: parseFloat(totalLiabilities), // Return total as a number
      totalEquity: parseFloat(totalEquity) // Return total as a number
    });
  } catch (error) {
    console.error("Error fetching balance sheet data:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch balance sheet data" });
  }
};

module.exports = {
  getBalanceSheetData
};
