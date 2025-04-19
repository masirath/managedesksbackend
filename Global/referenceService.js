const mongoose = require('mongoose');
const moment = require('moment'); // Consider adding moment for more flexible date formatting

// Counter model for sequential references
const Counter = mongoose.models.Counter || 
  mongoose.model('Counter', new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
    lastUsed: { type: Date, default: Date.now } // Track when reference was last generated
  }));

// Enhanced reference patterns configuration
const REFERENCE_TYPES = {
  JOURNAL: { 
    prefix: 'JE', 
    format: 'YYYY-MM', // JE-2023-01-0001 (monthly sequence)
    description: 'Journal Entry',
    sequenceReset: 'month' // Reset counter monthly
  },
  INVOICE: { 
    prefix: 'INV', 
    format: 'YYYY', // INV-2023-0001 (yearly sequence)
    description: 'Invoice',
    sequenceReset: 'year'
  },
  PAYMENT: { 
    prefix: 'PAY', 
    format: 'YYYYMMDD', // PAY-20230515-0001 (daily sequence)
    description: 'Payment',
    sequenceReset: 'day'
  },
  DOCUMENT: {
    prefix: 'DOC',
    format: 'YYYYMM', // DOC-202305-0001
    description: 'Supporting Document',
    sequenceReset: 'month'
  }
};

/**
 * Generates sequential reference numbers with enhanced features
 * @param {string} type - Reference type (JOURNAL/INVOICE/PAYMENT/DOCUMENT)
 * @param {Date} [date] - Optional date for reference period
 * @param {string} [suffix] - Optional suffix to append
 * @returns {Promise<string>} Formatted reference number
 * @throws {Error} If invalid type or database error
 */
const generateReference = async (type, date = new Date(), suffix = '') => {
  const config = REFERENCE_TYPES[type];
  if (!config) {
    throw new Error(`Invalid reference type. Valid types: ${Object.keys(REFERENCE_TYPES).join(', ')}`);
  }

  const period = formatPeriod(date, config.format);
  const counterId = `${type}_${period}`;

  try {
    // Check if we need to reset the sequence
    const shouldReset = await checkSequenceReset(config.sequenceReset, counterId, date);
    
    const update = { 
      $inc: { seq: 1 },
      $set: { lastUsed: new Date() }
    };
    
    if (shouldReset) {
      update.$set.seq = 1; // Reset sequence
    }

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      update,
      { new: true, upsert: true }
    );

    const reference = `${config.prefix}-${period}-${counter.seq.toString().padStart(4, '0')}`;
    return suffix ? `${reference}-${suffix}` : reference;
  } catch (error) {
    console.error('Reference generation error:', error);
    throw new Error(`Failed to generate reference: ${error.message}`);
  }
};

/**
 * Checks if sequence should be reset based on configuration
 */
const checkSequenceReset = async (resetType, counterId, currentDate) => {
  if (!resetType) return false;
  
  const counter = await Counter.findById(counterId);
  if (!counter) return false;
  
  const now = new Date(currentDate);
  const lastUsed = new Date(counter.lastUsed);
  
  switch(resetType) {
    case 'day':
      return now.getDate() !== lastUsed.getDate() || 
             now.getMonth() !== lastUsed.getMonth() || 
             now.getFullYear() !== lastUsed.getFullYear();
    case 'month':
      return now.getMonth() !== lastUsed.getMonth() || 
             now.getFullYear() !== lastUsed.getFullYear();
    case 'year':
      return now.getFullYear() !== lastUsed.getFullYear();
    default:
      return false;
  }
};

/**
 * Enhanced date period formatting
 */
const formatPeriod = (date, format) => {
  const d = new Date(date);
  
  // Extended format options
  switch(format) {
    case 'YYYY': 
      return d.getFullYear();
    case 'YYYY-MM': 
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
    case 'YYYYMM': 
      return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}`;
    case 'YYYYMMDD': 
      return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}`;
    default: 
      throw new Error(`Unsupported period format: ${format}`);
  }
};

/**
 * Generate a document reference that links to a journal entry
 */
const generateDocumentReference = async (journalReference) => {
  try {
    const ref = await generateReference('DOCUMENT');
    return `${journalReference}-ATT-${ref.split('-')[2]}`; // JE-2023-01-0001-ATT-0001
  } catch (error) {
    console.error('Failed to generate document reference:', error);
    throw error;
  }
};

module.exports = { 
  generateReference,
  generateDocumentReference, // For linking documents to journal entries
  REFERENCE_TYPES // Export for validation purposes
};