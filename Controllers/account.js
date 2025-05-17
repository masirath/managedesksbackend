const Account = require("../Models/Account");
const ManualJournal = require("../Models/ManualJournal");
const {
  success_200,
  failed_400,
  incomplete_400,
  unauthorized,
  catch_400,
} = require("../Global/responseHandlers");
const { authorization } = require("../Global/authorization");

// Predefined account types and categories
const accountTypes = [
  "Bank & Cash",
  "Current Asset",
  "Depreciation",
  "Fixed Asset",
  "Inventory",
  "Non-current Asset",
  "Prepayment",
  "Equity",
  "Direct Costs",
  "Expense",
  "Income",
  "Other Income",
  "Revenue",
  "Sales",
  "Current Liability",
  "Liability",
  "Non-current Liability",
];

const accountCategories = ["Assets", "Liabilities", "Equity", "Expenses", "Income"];

/**
 * Create a new account.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */

const create_account = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { name, code, type, category, branch, description, currency, status, parentAccount, isReceivable, isPayable,isContraAccount = false,  } = req.body;

    // Validate required fields
    if (!name || !code || !type || !category) {
      return incomplete_400(res, "Name, code, type, and category are required");
    }

    // Validate account type and category
    if (!accountTypes.includes(type)) {
      return failed_400(res, "Invalid account type");
    }
    if (!accountCategories.includes(category)) {
      return failed_400(res, "Invalid account category");
    }

    // Validate isReceivable and isPayable are booleans
    if (isReceivable !== undefined && typeof isReceivable !== 'boolean') {
      return failed_400(res, "isReceivable must be a boolean");
    }
    if (isPayable !== undefined && typeof isPayable !== 'boolean') {
      return failed_400(res, "isPayable must be a boolean");
    }

    // If parentAccount is provided, validate it exists
    if (parentAccount) {
      const parentAccountExists = await Account.findById(parentAccount);
      if (!parentAccountExists) {
        return failed_400(res, "Parent account does not exist");
      }
    }

    // Check for existing account with the same code or name
    const existingAccount = await Account.findOne({
      $or: [{ code }, { name }],
      // branch: branch || authorize.branch,
      branch: authorize.branch,

    });

    if (existingAccount) {
      return failed_400(res, "Account with this code or name already exists");
    }

    // Create new account
    const account = new Account({
      name,
      code,
      type,
      category,
      balance: 0,
      branch: branch || authorize.branch,
      description: description || "",
      currency: currency || "OMR",
      status: status || "Active",
      parentAccount: parentAccount || null, // Ensure parentAccount is optional
      isReceivable: isReceivable || false, // Default to false if not provided
      isPayable: isPayable || false, // Default to false if not provided
      isContraAccount, // Include the flag from the request
      createdBy: authorize.id,
    });

    const newAccount = await account.save();

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: newAccount,
    });
  } catch (error) {
    return catch_400(res, error.message);
  }
};


//end create chart of account with payable , receivable, account

/**
 * Get a single account by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const get_account = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { id } = req.params;
    if (!id) return incomplete_400(res, "Account ID is required");

    const account = await Account.findOne({ _id: id, status: { $ne: 2 } });

    if (!account) {
      return failed_400(res, "Account not found");
    }

    return res.status(200).json({
      success: true,
      message: "Account retrieved successfully",
      data: account,
    });
  } catch (error) {
    return catch_400(res, error.message);
  }
};

/**
 * Get all accounts with optional filtering and pagination.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
// const get_all_accounts = async (req, res) => {
//   try {
//     const authorize = authorization(req);
//     if (!authorize) return unauthorized(res);

//     const { branch, type, category, page = 1, limit = 10 } = req.query;

//     const filter = { status: { $ne: 2 } };
//     if (branch) filter.branch = branch;
//     if (type) filter.type = type;
//     if (category) filter.category = category;

//     const accounts = await Account.find(filter)
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     return res.status(200).json({
//       success: true,
//       message: "Accounts retrieved successfully",
//       data: accounts,
//     });
//   } catch (error) {
//     return catch_400(res, error.message);
//   }
// };
const get_all_accounts = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    // Parse and sanitize pagination values
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    // Prevent abuse: limit max per page
    limit = Math.min(limit, 100); // cap at 100 max
    page = Math.max(page, 1); // page must be >= 1

    const { branch, type, category } = req.query;

    const filter = { status: { $ne: 2 } };
    if (branch) filter.branch = branch;
    if (type) filter.type = type;
    if (category) filter.category = category;

    const totalCount = await Account.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    const accounts = await Account.find(filter)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      message: "Accounts retrieved successfully",
      data: accounts,
      meta: {
        totalCount,
        currentPage: page,
        totalPages,
        pageSize: limit,
      },
    });
  } catch (error) {
    return catch_400(res, error.message);
  }
};

/**
 * Update an existing account.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const update_account = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { id } = req.params;
    const { name, code, type, category, description, currency, status } = req.body;

    // Validate account type and category if provided
    if (type && !accountTypes.includes(type)) {
      return failed_400(res, "Invalid account type");
    }
    if (category && !accountCategories.includes(category)) {
      return failed_400(res, "Invalid account category");
    }

    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      { name, code, type, category, description, currency, status },
      { new: true, runValidators: true }
    );

    if (!updatedAccount) {
      return failed_400(res, "Account not found");
    }

    return res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: updatedAccount,
    });
  } catch (error) {
    return catch_400(res, error.message);
  }
};


/**
 * Update account balances based on a manual journal entry.
 */
const update_balances_from_journal = async (journalEntry) => {

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    // Loop through each journal entry
    for (const entry of journalEntry.entries) {
      const { accountId, debit, credit } = entry;

      // Find the account and update the balance
      const account = await Account.findById(accountId).session(session);

      if (debit) {
        account.balance += debit; // Debit increases the balance
      }

      if (credit) {
        account.balance -= credit; // Credit decreases the balance
      }

      await account.save({ session }); // Save the updated account balance
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    // Rollback the transaction in case of error
    session.abortTransaction();
    throw new Error('Failed to update balances from journal: ' + error.message);
  }
};

module.exports = {
  create_account,
  update_account,
  get_all_accounts,
  get_account,
  update_balances_from_journal,
};