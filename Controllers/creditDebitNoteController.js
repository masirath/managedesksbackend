const CreditDebitNote = require('../Models/CreditDebitNote');
const { success_200, failed_400, catch_400 } = require('../Global/responseHandlers');

// Create a new Credit/Debit Note
const createNote = async (req, res) => {
  try {
    const data = req.body;

    // Force branch to be current user's branch
    const note = new CreditDebitNote({
      ...data,
      branch: req.user.branch,
      created: new Date(),
      created_by: req.user._id
    });

    await note.save();
    return success_200(res, 'Note created successfully', note);
  } catch (err) {
    return catch_400(res, err);
  }
};

// Get all notes for current branch
const getAllNotes = async (req, res) => {
  try {
    const { type, status, startDate, endDate } = req.query;

    const query = { branch: req.user.branch };
    if (type) query.type = type;
    if (status) query.status = Number(status);
    if (startDate && endDate) {
      query.issueDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const notes = await CreditDebitNote.find(query)
      .populate('customerId vendorId branch created_by')
      .sort({ createdAt: -1 });

    return success_200(res, 'Notes fetched', notes);
  } catch (err) {
    return catch_400(res, err);
  }
};

// Get a single note
const getNoteById = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id)
      .populate('customerId vendorId branch created_by');

    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    return success_200(res, 'Note fetched', note);
  } catch (err) {
    return catch_400(res, err);
  }
};

// Update note
const updateNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id);
    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    const updatedNote = await CreditDebitNote.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    return success_200(res, 'Note updated', updatedNote);
  } catch (err) {
    return catch_400(res, err);
  }
};

// Delete note
const deleteNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id);
    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    await CreditDebitNote.findByIdAndDelete(req.params.id);
    return success_200(res, 'Note deleted');
  } catch (err) {
    return catch_400(res, err);
  }
};

// Apply amount
const applyNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const note = await CreditDebitNote.findById(id);
    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    if (note.balanceRemaining < amount) return failed_400(res, 'Insufficient balance');

    note.amountUsed += amount;
    note.balanceRemaining -= amount;
    note.status = note.balanceRemaining === 0 ? 2 : 3;

    await note.save();
    return success_200(res, 'Note applied', note);
  } catch (err) {
    return catch_400(res, err);
  }
};

// Convert (stub)
const convertNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id);
    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    return success_200(res, 'Convert function placeholder');
  } catch (err) {
    return catch_400(res, err);
  }
};

// Share link
const generateShareLink = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id);
    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    const token = require('crypto').randomBytes(12).toString('hex');
    note.publicShareToken = token;
    note.publicShareExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await note.save();

    return success_200(res, 'Public link generated', {
      link: `${process.env.FRONTEND_URL}/notes/share/${token}`
    });
  } catch (err) {
    return catch_400(res, err);
  }
};

// Email (stub)
const emailNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id).populate('customerId vendorId');
    if (!note) return failed_400(res, 'Note not found');
    if (String(note.branch) !== String(req.user.branch)) {
      return failed_400(res, 'Unauthorized branch access');
    }

    return success_200(res, `Email sent to ${note.customerId?.email || note.vendorId?.email}`);
  } catch (err) {
    return catch_400(res, err);
  }
};

module.exports = {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  applyNote,
  convertNote,
  generateShareLink,
  emailNote
};
