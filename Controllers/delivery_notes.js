const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");

const delivery_notes = require("../Models/delivery_notes");
const delivery_note_details = require("../Models/delivery_note_details");
const products = require("../Models/products");

// Auto-generate next delivery note number
const get_next_delivery_number = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (!authorize) return unauthorized(res);

    const total_notes = await delivery_notes.countDocuments({
      branch: authorize?.branch,
    });

    const next_number = number + total_notes;

    const existing = await delivery_notes.findOne({
      number: next_number,
      branch: authorize?.branch,
    });

    if (existing) {
      return await get_next_delivery_number(req, res, next_number);
    } else {
      return next_number;
    }
  } catch (error) {
    console.error("Error generating delivery note number:", error.message);
    catch_400(res, error?.message);
  }
};

// Create delivery note
const create_delivery_note = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { customer, date, reference, details, status, branch } = req.body;

    let new_number = await get_next_delivery_number(req, res, 1000);
    let assigned_number = req.body.number || new_number;

    // Validate required fields
    if (!customer || !assigned_number || !date || !details?.length) {
      return incomplete_400(res);
    }

    const existing = await delivery_notes.findOne({
      number: assigned_number,
      branch: branch || authorize?.branch,
      status: 1,
    });

    if (existing) {
      return failed_400(res, "Delivery Note number already exists");
    }

    // Create delivery note
    const delivery = new delivery_notes({
      customer,
      number: assigned_number,
      date,
      reference: reference || "",
      total_items: 0,
      status: status || 0,
      branch: branch || authorize?.branch,
      ref: authorize?.ref,
      created: new Date(),
      created_by: authorize?.id,
    });

    const saved_note = await delivery.save();
    let embeddedDetails = [];
    let item_count = 0;

    for (let item of details) {
      const product = await products
        .findById(item.description)
        .populate("unit");

      if (product) {
        // Save to delivery_note_details collection
        const detail = new delivery_note_details({
          delivery_note: saved_note._id,
          description: product._id,
          name: product.name,
          unit: item.unit || product.unit?._id,
          unit_name: item.unit_name || product.unit?.name || "",
          quantity: item.quantity,
          free: item.free || 0,
          barcode: item.barcode || "",
          status: status || 0,
          branch: branch || authorize?.branch,
          ref: authorize?.ref,
          created: new Date(),
          created_by: authorize?.id,
        });

        await detail.save();
        item_count++;

        // Embed into delivery_note document
        embeddedDetails.push({
          description: product._id,
          unit: item.unit || product.unit?._id,
          unit_name: item.unit_name || product.unit?.name || "",
          quantity: item.quantity,
          free: item.free || 0,
          barcode: item.barcode || "",
          remarks: item.remarks || "",
        });
      }
    }

    if (item_count === details.length) {
      saved_note.total_items = item_count;
      saved_note.details = embeddedDetails;
      await saved_note.save();

      return success_200(res, "Delivery Note created successfully");
    } else {
      return failed_400(res, "Failed to create all delivery note items");
    }
  } catch (error) {
    console.error("Error creating delivery note:", error.message);
    return catch_400(res, error.message);
  }
};

// Delete delivery note
const delete_delivery_note = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.body;
      if (!id) return incomplete_400(res);

      const note = await delivery_notes.findById(id);
      if (!note || note.status === 2) return failed_400(res, "Not found");

      note.status = 2;
      await note.save();
      success_200(res, "Delivery Note deleted");
    } else {
      unauthorized(res);
    }
  } catch (error) {
    catch_400(res, error?.message);
  }
};

// Get delivery note
const get_delivery_note = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { id } = req?.body;
      if (!id) return incomplete_400(res);

      const note = await delivery_notes
        .findById(id)
        .populate("customer")
        .populate("branch");

      if (!note || note.status === 2) return failed_400(res, "Not found");

      const details = await delivery_note_details
        .find({ delivery_note: note?._id })
        .populate("description");

      success_200(res, "", {
        ...note.toObject(),
        details,
      });
    } else {
      unauthorized(res);
    }
  } catch (error) {
    catch_400(res, error?.message);
  }
};

// Get all delivery notes
const get_all_delivery_notes = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const { search, customer, status, date, sort, page, limit } = req.body;

    const query = {
      branch: authorize.branch,
      status: { $ne: 2 },
    };

    if (search) query.$or = [{ number: { $regex: search, $options: "i" } }];
    if (customer) query.customer = customer;
    if (status == 0) query.status = status;

    if (date?.start && date?.end) {
      query.date = {
        $gte: new Date(date.start),
        $lte: new Date(date.end),
      };
    }

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;
    const sortOption = sort === 0 ? { total_items: 1 } : { created: -1 };

    const total = await delivery_notes.countDocuments(query);
    const data = await delivery_notes
      .find(query)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("customer");

    success_200(res, "", {
      currentPage: page_number,
      totalPages: Math.ceil(total / page_limit),
      totalCount: total,
      data,
    });
  } catch (error) {
    catch_400(res, error?.message);
  }
};

module.exports = {
  create_delivery_note,
  delete_delivery_note,
  get_delivery_note,
  get_all_delivery_notes,
};
