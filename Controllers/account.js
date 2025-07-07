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

//comment below for testing branch, ref, and
const create_account = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const {
      name,
      code,
      type,
      category,
      description,
      currency,
      status,
      parentAccount,
      isReceivable,
      isPayable,
      isContraAccount = false,
      branch,
    } = req.body;

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

    // Ensure isReceivable and isPayable are boolean
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

    // Check for existing account with same code or name in current branch
    const existingAccount = await Account.findOne({
      $or: [{ code }, { name }],
      branch: branch || authorize.branch,
      status: { $ne: 2 }
    });

    if (existingAccount) {
      return failed_400(res, "Account with this code or name already exists");
    }

    // Create new account with auto-filled fields
    const account = new Account({
      name,
      code,
      type,
      category,
      balance: 0,
      branch: branch || authorize.branch,
      description: description || "",
      currency: currency || "OMR",
      status: status ? parseInt(status) : 1, // Active = 1
      parentAccount: parentAccount || null,
      isReceivable: isReceivable || false,
      isPayable: isPayable || false,
      isContraAccount,

      // ✅ Auto-set from authorize
      created: new Date(),
      created_by: authorize.id,
      ref: authorize.ref || 1, // fallback to default
    });

    const newAccount = await account.save();

    return success_200(res, "Account created successfully", newAccount);

  } catch (error) {
    console.error("Error creating account:", error.message);
    return catch_400(res, error.message);
  }
};

//end create chart of account with payable , receivable, account

/**
 * Get a single account by ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
// const get_account = async (req, res) => {
//   try {
//     const authorize = authorization(req);
//     if (!authorize) return unauthorized(res);

//     const { id } = req.params;
//     if (!id) return incomplete_400(res, "Account ID is required");

//     const account = await Account.findOne({ _id: id, status: { $ne: 2 } });

//     if (!account) {
//       return failed_400(res, "Account not found");
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Account retrieved successfully",
//       data: account,
//     });
//   } catch (error) {
//     return catch_400(res, error.message);
//   }
// };

const get_account = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { id } = req.params;
    if (!id) return incomplete_400(res, "Account ID is required");

    const account = await Account.findOne({
      _id: id,
      branch: authorize.branch, // Ensure it belongs to user's branch
      status: { $ne: 2 },      // Exclude deleted
    });

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

//     // Parse and sanitize pagination values
//     let page = parseInt(req.query.page) || 1;
//     let limit = parseInt(req.query.limit) || 10;

//     // Prevent abuse: limit max per page
//     limit = Math.min(limit, 100); // cap at 100 max
//     page = Math.max(page, 1); // page must be >= 1

//     const { branch, type, category } = req.query;

//     const filter = { status: { $ne: 2 } };
//     if (branch) filter.branch = branch;
//     if (type) filter.type = type;
//     if (category) filter.category = category;

//     const totalCount = await Account.countDocuments(filter);
//     const totalPages = Math.ceil(totalCount / limit);

//     const accounts = await Account.find(filter)
//       .skip((page - 1) * limit)
//       .limit(limit);

//     return res.status(200).json({
//       success: true,
//       message: "Accounts retrieved successfully",
//       data: accounts,
//       meta: {
//         totalCount,
//         currentPage: page,
//         totalPages,
//         pageSize: limit,
//       },
//     });
//   } catch (error) {
//     return catch_400(res, error.message);
//   }
// };

/**
 * Get all accounts with optional filtering, sorting, and pagination.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
// const get_all_accounts = async (req, res) => {
//   try {
//     const authorize = authorization(req);
//     if (!authorize) return unauthorized(res);

//     // Destructure filters from request body
//     const {
//       search,
//       type,
//       category,
//       status,
//       sort,
//       page,
//       limit,
//     } = req.body;

//     const page_number = Number(page) || 1;
//     const page_limit = Number(limit) || 10;

//     // Base filter: always apply branch and exclude deleted accounts
//     const filter = {
//       branch: authorize.branch,
//       status: { $ne: 2 }, // Exclude deleted accounts
//     };

//     // Apply role-based branch override (if user is admin)
//     if (authorize.role === "admin" && req.body.branch) {
//       // Validate ObjectId before using
//       if (mongoose.Types.ObjectId.isValid(req.body.branch)) {
//         filter.branch = req.body.branch;
//       }
//     }

//     // Apply filters based on request body
//     if (search) {
//       filter.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { code: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (type) filter.type = type;
//     if (category) filter.category = category;
//     if (status !== undefined) filter.status = status;

//     // Set sorting options
//     let sortOption = { created: -1 }; // default sort
//     if (sort == 0) {
//       sortOption = { balance: 1 }; // ascending balance
//     } else if (sort == 1) {
//       sortOption = { balance: -1 }; // descending balance
//     }

//     // Get total count for pagination metadata
//     const totalCount = await Account.countDocuments(filter);

//     // Fetch paginated data
//     const accounts = await Account.find(filter)
//       .sort(sortOption)
//       .skip((page_number - 1) * page_limit)
//       .limit(page_limit)
//       .populate("branch", "name")
//       .lean();

//     const totalPages = Math.ceil(totalCount / page_limit);

//     return success_200(res, "Accounts retrieved successfully", {
//       currentPage: page_number,
//       totalPages,
//       totalCount,
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

    // Destructure filters from query params
    const {
      search,
      type,
      category,
      status,
      sort,
      page,
      limit,
    } = req.query;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    // Base filter
    const filter = {
      branch: authorize.branch, // 🔐 Only allow current user's branch
      status: { $ne: 2 },       // Exclude deleted accounts
    };

    // Apply optional filters
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status !== undefined) filter.status = status;

    // Sort options
    let sortOption = { created: -1 };
    if (sort == 0) sortOption = { balance: 1 };
    if (sort == 1) sortOption = { balance: -1 };

    // Pagination
    const totalCount = await Account.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / page_limit);

    const accounts = await Account.find(filter)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .lean();

    return success_200(res, "Accounts retrieved successfully", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: accounts,
    });

  } catch (error) {
    console.error("Error fetching accounts:", error.message);
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