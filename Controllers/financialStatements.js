const { success_200, failed_400, unauthorized, catch_400 } = require("../Global/responseHandlers");
const { authorization } = require("../Global/authorization");
const Account = require("../Models/Account");
const Transaction = require("../Models/Transaction");
const FinancialStatement = require("../Models/FinancialStatement");

/**
 * Generate Balance Sheet for a specific date (POST)
 */
const generateBalanceSheet = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      return unauthorized(res);
    }
    req.user = authorize; // ✅ This line was missing

    const { as_of_date } = req.query;
    const branch = req.user.branch;

    if (!as_of_date) {
      return failed_400(res, "As of date is required (YYYY-MM-DD format)");
    }

    const accounts = await Account.find({ branch }).lean();

    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await Transaction.calculateAccountBalance(
          account.account_code,
          as_of_date,
          branch
        );
        return { ...account, balance };
      })
    );

    const balanceSheet = {
      report_date: as_of_date,
      assets: accountsWithBalances.filter(a => a.account_type === 'asset'),
      liabilities: accountsWithBalances.filter(a => a.account_type === 'liability'),
      equity: accountsWithBalances.filter(a => a.account_type === 'equity')
    };

    // Save the balance sheet data to FinancialStatement
    await FinancialStatement.findOneAndUpdate(
      { branch, period: as_of_date, type: 'balance_sheet' },
      { 
        branch, 
        period: as_of_date, 
        type: 'balance_sheet', 
        data: balanceSheet, 
        generated_at: new Date() 
      },
      { upsert: true, new: true }
    );

    return success_200(res, "Balance sheet generated successfully", balanceSheet);
  } catch (error) {
    console.error("Balance sheet generation error:", error);
    return catch_400(res, error.message);
  }
};

/**
 * Get Balance Sheet for a specific date (GET)
 */
const getBalanceSheetByDateHandler = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      console.log("Unauthorized request detected");
      return unauthorized(res);
    }
    req.user = authorize;
    const { date } = req.query;  // Use query params for the date
    const branch = req.user.branch; // Fetching the branch from the user data
    if (!date) {
      return failed_400(res, "Date is required");
    }

    const accounts = await Account.find({ branch }).lean();

    // Calculate balances for each account up to the specified date
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await Transaction.calculateAccountBalance(
          account.account_code,
          date,
          branch
        );
        return { ...account, balance };
      })
    );

    const balanceSheet = {
      report_date: date,
      assets: accountsWithBalances.filter(a => a.account_type === 'asset'),
      liabilities: accountsWithBalances.filter(a => a.account_type === 'liability'),
      equity: accountsWithBalances.filter(a => a.account_type === 'equity')
    };

    return success_200(res, "Balance sheet retrieved successfully", balanceSheet);
  } catch (error) {
    console.error("Balance sheet retrieval error:", error);
    return catch_400(res, error.message);
  }
};

/**
 * Get Historical Balance Sheets
 */
const getBalanceSheetHistoryHandler = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      return unauthorized(res);
    }
    req.user = authorize; // ✅ Add this to access req.user.branch

    const branch = req.user.branch;
    const { limit = 10, page = 1 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      return failed_400(res, "Invalid pagination parameters");
    }

    const history = await FinancialStatement.find({ branch, type: 'balance_sheet' })
      .sort({ period: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    const total = await FinancialStatement.countDocuments({ branch, type: 'balance_sheet' });

    return success_200(res, "Historical balance sheets retrieved", {
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Historical balance sheets error:", error);
    return catch_400(res, error.message);
  }
};

/**
 * Balance Sheet Summary
 */
const getBalanceSheetSummaryHandler = async (req, res) => {
  try {
    const authorize = authorization(req); // ✅ Add this
    if (!authorize) {
      return unauthorized(res);
    }
    req.user = authorize; // ✅ Assign decoded user

    const branch = req.user.branch;
    const as_of_date = req.query.as_of_date || new Date().toISOString().split('T')[0];

    const balanceSheet = await FinancialStatement.findOne({
      branch,
      type: 'balance_sheet',
      period: { $lte: as_of_date }
    }).sort({ period: -1 });

    if (!balanceSheet) {
      return failed_400(res, "No balance sheet found for the specified period");
    }

    const totals = {
      totalAssets: balanceSheet.data.assets.reduce((sum, a) => sum + (a.balance || 0), 0),
      totalLiabilities: balanceSheet.data.liabilities.reduce((sum, l) => sum + (l.balance || 0), 0),
      totalEquity: balanceSheet.data.equity.reduce((sum, e) => sum + (e.balance || 0), 0)
    };

    totals.netWorth = totals.totalAssets - totals.totalLiabilities;

    return success_200(res, "Balance sheet summary retrieved", {
      ...totals,
      report_date: balanceSheet.period
    });
  } catch (error) {
    console.error("Balance sheet summary error:", error);
    return catch_400(res, error.message);
  }
};

module.exports = {
  generateBalanceSheet,
  getBalanceSheetHistoryHandler,
  getBalanceSheetByDateHandler,
  getBalanceSheetSummaryHandler,
};
