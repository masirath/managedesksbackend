
const GeneralLedger = require("../Models/GeneralLedger");
const Account = require("../Models/Account");
const {
  success_200,
  failed_400,
  unauthorized,
  catch_400,
} = require("../Global/responseHandlers");
const { authorization } = require("../Global/authorization");

/**
 * Fetch General Ledger Summary (per account)
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getSummary = async (req, res) => {
  try {
    // Authorization check
    const authorize = authorization(req);
    if (!authorize) {
      console.log("Unauthorized request detected");
      return unauthorized(res);
    }

    // Extract query parameters
    let { start_date, end_date } = req.query;

    // Date range filter (Ensure valid dates)
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start) || isNaN(end)) {
        return failed_400(res, "Invalid date format provided.");
      }

      // Aggregate to get the summary for each account
      const summary = await GeneralLedger.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$account", // Group by account
            totalDebit: {
              $sum: {
                $cond: [{ $eq: ["$entryType", "debit"] }, "$amount", 0],
              },
            },
            totalCredit: {
              $sum: {
                $cond: [{ $eq: ["$entryType", "credit"] }, "$amount", 0],
              },
            },
          },
        },
        {
          $lookup: {
            from: "accounts", // Join with the accounts collection
            localField: "_id",
            foreignField: "_id",
            as: "accountDetails",
          },
        },
        { $unwind: "$accountDetails" },
        {
          $project: {
            accountCode: "$accountDetails.account_code",
            accountName: "$accountDetails.account_name",
            totalDebit: 1,
            totalCredit: 1,
            balance: {
              $subtract: ["$totalDebit", "$totalCredit"],
            },
          },
        },
      ]);

      return success_200(res, "General Ledger Summary retrieved successfully", summary);
    } else {
      return failed_400(res, "Start date and end date are required.");
    }
  } catch (error) {
    console.error("Error fetching summary:", error);
    return catch_400(res, error.message);
  }
};

/**
 * Fetch Drilldown Transactions for a Specific Account
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getDrilldownTransactions = async (req, res) => {
  try {
    // Authorization check
    const authorize = authorization(req);
    if (!authorize) {
      console.log("Unauthorized request detected");
      return unauthorized(res);
    }

    let { account_code, start_date, end_date } = req.query;

    // Ensure account_code is valid
    if (!account_code || isNaN(account_code)) {
      return failed_400(res, "Invalid or missing account_code.");
    }

    // Ensure valid date range
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start) || isNaN(end)) {
        return failed_400(res, "Invalid date format provided.");
      }

      // Fetch transactions for the specific account with date range filter
      const transactions = await GeneralLedger.find({
        account_code: parseInt(account_code),
        date: { $gte: start, $lte: end },
      })
        .populate("journalEntryId", "description") // Fetch journal entry details
        .populate("account", "account_name balance") // Fetch account details
        .lean();

      if (transactions.length === 0) {
        return failed_400(res, "No transactions found for the provided filters.");
      }

      return success_200(res, "Drilldown transactions retrieved successfully", transactions);
    } else {
      return failed_400(res, "Start date and end date are required.");
    }
  } catch (error) {
    console.error("Error fetching drilldown transactions:", error);
    return catch_400(res, error.message);
  }
};

module.exports = {
  getSummary,
  getDrilldownTransactions,
};
