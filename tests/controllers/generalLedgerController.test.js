
const sinon = require("sinon");
//const { create_post_entry } = require("../../controllers/generalLedgerController");
const {create_post_entry} = require("../../Controllers/generalLedger")
const ManualJournal = require("../../Models/ManualJournal");
const Account = require("../../Models/Account");
const GeneralLedger = require("../../Models/GeneralLedger");

describe("create_post_entry", () => {
  let req, res;

  beforeEach(() => {
    // Mock request and response objects
    req = {
      body: {
        entry: "65fd3a1e8b48d8f5c0a7c9e1", // Journal entry ID
        approver: "65fd3a2e8b48d8f5c0a7c9e2", // Optional: Approver ID
        comments: "This entry needs approval", // Optional: Comments
      },
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    // Restore all mocks after each test
    sinon.restore();
  });

  it("should create ledger entries and return a 201 status", async () => {
    // Mock ManualJournal.findById
    const mockJournalEntry = {
      _id: "65fd3a1e8b48d8f5c0a7c9e1",
      debits: [
        { account: "67c92ac4322e4fe66a49db6c", amount: 100 },
      ],
      credits: [
        { account: "67c92b57322e4fe66a49db87", amount: 100 },
      ],
      populate: sinon.stub().returnsThis(), // Mock the populate method
    };
    sinon.stub(ManualJournal, "findById").returns({
      populate: sinon.stub().resolves(mockJournalEntry), // Mock populate to return the mockJournalEntry
    });

    // Mock Account.findById for debits
    const mockDebitAccount = {
      _id: "67c92ac4322e4fe66a49db6c",
      balance: 1000,
      save: sinon.stub().resolves(),
    };
    sinon.stub(Account, "findById")
      .withArgs("67c92ac4322e4fe66a49db6c")
      .resolves(mockDebitAccount);

    // Mock Account.findById for credits
    const mockCreditAccount = {
      _id: "67c92b57322e4fe66a49db87",
      balance: 2000,
      save: sinon.stub().resolves(),
    };
    // Mock GeneralLedger.save
    const mockLedgerEntry = {
      _id: "65fd3a1e8b48d8f5c0a7c9e3",
      journalEntryId: "65fd3a1e8b48d8f5c0a7c9e1",
      account: "67c92ac4322e4fe66a49db6c",
      debit: 100,
      credit: 0,
      balance: 1100,
      approver: "65fd3a2e8b48d8f5c0a7c9e2",
      comments: "This entry needs approval",
      save: sinon.stub().resolves(),
    };
    sinon.stub(GeneralLedger.prototype, "save").resolves(mockLedgerEntry);

    // Call the function
    await create_post_entry(req, res);

    // Assertions
    sinon.assert.calledWith(res.status, 201);
    sinon.assert.calledWith(res.json, {
      message: "Journal entry posted to ledger",
      ledgerEntries: sinon.match.array,
    });
  });

  it("should return a 404 status if the journal entry is not found", async () => {
    // Mock ManualJournal.findById to return null
    sinon.stub(ManualJournal, "findById").returns({
      populate: sinon.stub().resolves(null), // Mock populate to return null
    });

    // Call the function
    await create_post_entry(req, res);

    // Assertions
    sinon.assert.calledWith(res.status, 404);
    sinon.assert.calledWith(res.json, {
      message: "Journal entry not found",
    });
  });

  it("should return a 500 status if an error occurs", async () => {
    // Mock ManualJournal.findById to throw an error
    sinon.stub(ManualJournal, "findById").returns({
      populate: sinon.stub().rejects(new Error("Database error")), // Mock populate to throw an error
    });

    // Call the function
    await create_post_entry(req, res);

    // Assertions
    sinon.assert.calledWith(res.status, 500);
    sinon.assert.calledWith(res.json, {
      message: "Server error",
      error: sinon.match.instanceOf(Error),
    });
  });
});