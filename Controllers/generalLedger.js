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
 * Fetch General Ledger Transactions with Filters, Pagination & Sorting
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getAllTransactions = async (req, res) => {
  try {
    // Authorization check
    const authorize = authorization(req);
    if (!authorize) {
      console.log("Unauthorized request detected");
      return unauthorized(res);
    }

    // Extract query parameters with validation
    let { account_code, start_date, end_date, page, limit, sort } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    let skip = (page - 1) * limit;

    let filter = {};

    // Ensure account_code is a valid number
    if (account_code) {
      filter.account_code = parseInt(account_code);
      if (isNaN(filter.account_code)) {
        return failed_400(res, "Invalid account_code provided.");
      }
    }

    // Date range filter (Ensuring valid dates)
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start) || isNaN(end)) {
        return failed_400(res, "Invalid date format provided.");
      }
      filter.date = { $gte: start, $lte: end };
    }

    // Sorting options
    let sortOptions = { date: -1 }; // Default: Newest first
    if (sort === "oldest") sortOptions = { date: 1 };

    // Fetch ledger entries with pagination & sorting
    const transactions = await GeneralLedger.find(filter)
      .populate("journalEntryId", "description") // Fetch journal entry details
      .populate("account", "account_name balance") // Fetch account details
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total transaction count for pagination
    const totalTransactions = await GeneralLedger.countDocuments(filter);

    return success_200(res, "General Ledger transactions retrieved successfully", {
      totalTransactions,
      page,
      totalPages: Math.ceil(totalTransactions / limit),
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return catch_400(res, error.message);
  }
};

/**
 * Fetch All Account Balances
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const getBalances = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      console.log("Unauthorized request detected");
      return unauthorized(res);
    }

    const accounts = await Account.find({}, "account_code account_name balance").lean();

    return success_200(res, "Account balances retrieved successfully", accounts);
  } catch (error) {
    console.error("Error fetching account balances:", error);
    return catch_400(res, error.message);
  }
};

module.exports = {
  getAllTransactions,
  getBalances,
};
