const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const transfers = require("../Models/transfers");
const { checknull } = require("../Global/checknull");
const inventories = require("../Models/inventories");
const transfers_details = require("../Models/transfers_details");
const transfers_log = require("../Models/transfers_log");
const transfers_details_log = require("../Models/transfers_details");
const transfers_units_details = require("../Models/transfers_units_details");
// const transfers_payments = require("../Models/transfers_payments");
const inventories_units_details = require("../Models/inventories_units_details");
// const transfers_payments_log = require("../Models/transfers_payments_log");
const transfers_units_details_log = require("../Models/transfers_units_details_log");
const inventories_log = require("../Models/inventories_log");
const inventories_units_details_log = require("../Models/inventories_units_details_log");
const { default: mongoose } = require("mongoose");

const get_next_transfer = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_transfer = await transfers.countDocuments({
        // branch: authorize?.branch,
        ref: authorize?.ref,
      });

      const next_transfer_number = number + total_transfer;

      const existing_transfer_number = await transfers.findOne({
        number: next_transfer_number,
        // branch: authorize?.branch,
        ref: authorize?.ref,
      });

      if (existing_transfer_number) {
        return await get_next_transfer(req, res, next_transfer_number);
      } else {
        return next_transfer_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

// const create_transfer = async (req, res) => {
//   try {
//     const authorize = authorization(req);

//     if (authorize) {
//       const {
//         supplier,
//         number,
//         date,
//         due_date,
//         details,
//         discount,
//         delivery,
//         delivery_status,
//         delivery_date,
//         payment_status,
//         payment_types,
//         payments,
//         status,
//         branch,
//       } = req?.body;

//       let new_number = await get_next_transfer(req, res, 1000);
//       let assigned_number = number ? number : new_number;

//       if (
//         !supplier ||
//         !assigned_number ||
//         !date ||
//         !due_date ||
//         !details?.length > 0
//       ) {
//         incomplete_400(res);
//       } else {
//         const selected_transfer_number = await transfers?.findOne({
//           number: assigned_number,
//           ref: authorize?.ref,
//         });

//         if (selected_transfer_number) {
//           failed_400(res, "Transfer number exists");
//         } else {
//           //create transfer
//           const transfer = new transfers({
//             supplier: supplier,
//             number: assigned_number,
//             date: date,
//             due_date: due_date,
//             subtotal: 0,
//             taxamount: 0,
//             discount: 0,
//             delivery: 0,
//             delivery_status: 0,
//             delivery_date: "",
//             payment_status: 0,
//             total: 0,
//             received: 0,
//             status: status ? status : 0,
//             ref: authorize?.ref,
//             branch: branch ? branch : authorize?.branch,
//             created: new Date(),
//             created_by: authorize?.id,
//           });

//           const transfer_save = await transfer?.save();

//           //transfer details
//           let transfer_details = [];
//           let transfer_subtotal = 0;
//           let transfer_taxamount = 0;
//           let transfer_total = 0;
//           let delivery_count = 0;
//           let count = 0;

//           if (details?.length > 0) {
//             for (value of details) {
//               const selected_inventory = await inventories
//                 ?.findById(value?.description)
//                 ?.populate({
//                   path: "product",
//                   match: { status: 1 },
//                   populate: { path: "unit" },
//                 });

//               //if selected sub unit
//               const selected_inventories_units_details =
//                 await inventories_units_details?.find({
//                   inventory: selected_inventory?._id,
//                 });

//               let selected_unit = {};
//               if (selected_inventories_units_details?.length > 0) {
//                 for (v of selected_inventories_units_details) {
//                   if (v?._id == value?.unit) {
//                     selected_unit = v;
//                   }
//                 }
//               }

//               if (selected_inventory) {
//                 let transfer_unit = value?.unit ? value?.unit : "";
//                 let transfer_unit_name = value?.unit_name
//                   ? value?.unit_name
//                   : "";
//                 let transfer_sale_price =
//                   selected_inventory?._id == value?.unit
//                     ? selected_inventory?.sale_price
//                       ? selected_inventory?.sale_price
//                       : 0
//                     : selected_unit?.sale_price
//                     ? selected_unit?.sale_price
//                     : 0;
//                 let transfer_purchase_price =
//                   selected_inventory?._id == value?.unit
//                     ? selected_inventory?.purchase_price
//                       ? selected_inventory?.purchase_price
//                       : 0
//                     : selected_unit?.purchase_price
//                     ? selected_unit?.purchase_price
//                     : 0;
//                 let transfer_price_per_unit =
//                   selected_inventory?._id == value?.unit
//                     ? selected_inventory?.price_per_unit
//                       ? selected_inventory?.price_per_unit
//                       : 0
//                     : selected_unit?.price_per_unit
//                     ? selected_unit?.price_per_unit
//                     : 0;
//                 let transfer_conversion =
//                   selected_inventory?._id == value?.unit
//                     ? selected_inventory?.conversion
//                       ? selected_inventory?.conversion
//                       : 0
//                     : selected_unit?.conversion
//                     ? selected_unit?.conversion
//                     : 0;
//                 let transfer_quantity = value?.quantity ? value?.quantity : 0;
//                 let transfer_delivered = value?.delivered
//                   ? value?.delivered
//                   : 0;
//                 let transfer_free = value?.free ? value?.free : 0;
//                 let transfer_tax = selected_inventory?.tax
//                   ? selected_inventory?.tax
//                   : 0;
//                 let transfer_barcode = selected_inventory?.barcode
//                   ? selected_inventory?.barcode
//                   : "";
//                 let transfer_expiry_date = selected_inventory?.expiry_date
//                   ? selected_inventory?.expiry_date
//                   : "";

//                 let price =
//                   parseFloat(transfer_quantity) *
//                   parseFloat(transfer_purchase_price);
//                 let tax_amount =
//                   parseFloat(price) * (parseFloat(transfer_tax) / 100);
//                 let total = parseFloat(price) + parseFloat(tax_amount);

//                 let total_quantity =
//                   parseFloat(transfer_quantity) + parseFloat(transfer_free);
//                 transfer_delivered =
//                   parseFloat(transfer_delivered) <= parseFloat(total_quantity)
//                     ? transfer_delivered
//                     : total_quantity;

//                 //delivery status count
//                 if (
//                   parseFloat(total_quantity) == parseFloat(transfer_delivered)
//                 ) {
//                   delivery_count++;
//                 }

//                 //inventories create (stock calculation)
//                 let inventory_stock = 0;
//                 if (selected_inventory?._id == value?.unit) {
//                   //if main unit
//                   let stock = parseFloat(selected_inventory?.stock || 0);

//                   if (
//                     parseFloat(value?.delivered || 0) <=
//                     parseFloat(selected_inventory?.stock || 0)
//                   ) {
//                     stock =
//                       parseFloat(selected_inventory?.stock || 0) -
//                       parseFloat(value?.delivered || 0);
//                   } else {
//                     stock = 0;
//                   }

//                   inventory_stock = stock;
//                 } else {
//                   //if sub unit
//                   let stock = parseFloat(selected_inventory?.stock || 0);
//                   let delivered = parseFloat(value?.delivered || 0);
//                   let conversion = parseFloat(selected_unit?.conversion || 0);

//                   let total_unit_stock =
//                     parseFloat(delivered || 0) / parseFloat(conversion || 0);

//                   if (
//                     parseFloat(total_unit_stock || 0) <= parseFloat(stock || 0)
//                   ) {
//                     stock =
//                       parseFloat(stock || 0) -
//                       parseFloat(total_unit_stock || 0);
//                   } else {
//                     stock = 0;
//                   }

//                   inventory_stock = stock;
//                 }

//                 selected_inventory.stock = inventory_stock;
//                 const selected_inventory_save =
//                   await selected_inventory?.save();

//                 //transfer details create
//                 const transfer_detail = new transfers_details({
//                   transfer: transfer_save?._id,
//                   description: selected_inventory?._id,
//                   name: selected_inventory?.product?.name,
//                   unit: transfer_unit,
//                   unit_name: transfer_unit_name,
//                   sale_price: transfer_sale_price,
//                   purchase_price: transfer_purchase_price,
//                   conversion: transfer_conversion,
//                   quantity: transfer_quantity,
//                   delivered: transfer_delivered,
//                   free: transfer_free,
//                   tax: transfer_tax,
//                   barcode: transfer_barcode,
//                   price_per_unit: transfer_price_per_unit,
//                   expiry_date: transfer_expiry_date,
//                   tax_amount: tax_amount,
//                   total: total,
//                   status: status ? status : 0,
//                   ref: authorize?.ref,
//                   branch: branch ? branch : authorize?.branch,
//                   created: new Date(),
//                   created_by: authorize?.id,
//                 });
//                 const transfer_detail_save = await transfer_detail?.save();

//                 //inventory units details
//                 if (selected_inventories_units_details?.length > 0) {
//                   for (v of selected_inventories_units_details) {
//                     if (v?._id == value?.unit) {
//                       let selected_inventory_unit_detail =
//                         await inventories_units_details?.findById(v?._id);

//                       if (selected_inventory_unit_detail) {
//                         let unit_stock = parseFloat(
//                           selected_inventory_unit_detail?.stock || 0
//                         );

//                         if (
//                           parseFloat(value?.delivered || 0) <=
//                           parseFloat(unit_stock || 0)
//                         ) {
//                           unit_stock =
//                             parseFloat(unit_stock || 0) -
//                             parseFloat(value?.delivered || 0);
//                         } else {
//                           unit_stock = 0;
//                         }

//                         selected_inventory_unit_detail.stock = unit_stock;
//                         const selected_inventory_unit_detail_save =
//                           await selected_inventory_unit_detail?.save();
//                       }
//                     } else {
//                       let selected_inventory_unit_detail =
//                         await inventories_units_details?.findById(v?._id);

//                       let unit_stock = parseFloat(
//                         selected_inventory_unit_detail?.stock || 0
//                       );
//                       let delivered = parseFloat(value?.delivered || 0);
//                       let conversion = parseFloat(v?.conversion || 0);

//                       let total_unit_stock =
//                         parseFloat(delivered || 0) *
//                         parseFloat(conversion || 0);

//                       if (
//                         parseFloat(total_unit_stock || 0) <=
//                         parseFloat(unit_stock || 0)
//                       ) {
//                         unit_stock =
//                           parseFloat(unit_stock || 0) -
//                           parseFloat(total_unit_stock);
//                       } else {
//                         unit_stock = 0;
//                       }

//                       selected_inventory_unit_detail.stock = unit_stock;

//                       const selected_inventory_unit_detail_save =
//                         await selected_inventory_unit_detail?.save();

//                       //transfer unit details
//                       const transfer_unit_detail = new transfers_units_details({
//                         details: transfer_detail_save?._id,
//                         inventory_unit: selected_inventory_unit_detail?._id,
//                         name: v?.name,
//                         quantity:
//                           parseFloat(value?.quantity || 0) *
//                           parseFloat(v?.conversion || 0),
//                         purchase_price: v?.price_per_unit,
//                         price_per_unit: v?.price_per_unit,
//                         sale_price: v?.sale_price,
//                         conversion: v?.conversion,
//                         unit_quantity:
//                           parseFloat(value?.quantity || 0) *
//                           parseFloat(v?.conversion || 0),
//                         unit_delivered: total_unit_stock,
//                         status: status ? status : 0,
//                         ref: authorize?.ref,
//                         branch: branch ? branch : authorize?.branch,
//                         created: new Date(),
//                         created_by: authorize?.id,
//                       });

//                       const transfer_unit_detail_save =
//                         transfer_unit_detail?.save();
//                     }
//                   }
//                 }

//                 transfer_subtotal =
//                   parseFloat(transfer_subtotal) + parseFloat(price);
//                 transfer_taxamount =
//                   parseFloat(transfer_taxamount) + parseFloat(tax_amount);
//                 transfer_total = parseFloat(transfer_total) + parseFloat(total);

//                 count++;
//               }
//             }
//           }

//           if (count == details?.length) {
//             const selected_transfer = await transfers?.findById(
//               transfer_save?._id
//             );

//             if (selected_transfer) {
//               //delivery status
//               let data_delivery_status = delivery_status
//                 ? parseFloat(delivery_status || 0)
//                 : 0;
//               let data_delivery_date = delivery_date ? delivery_date : "";

//               if (parseFloat(data_delivery_status) == 2) {
//                 if (parseFloat(delivery_count) == transfer_details?.length) {
//                   data_delivery_status = 2;
//                 } else if (
//                   parseFloat(delivery_count) > 0 &&
//                   parseFloat(delivery_count) < transfer_details?.length
//                 ) {
//                   data_delivery_status = 1;
//                   data_delivery_date = "";
//                 } else {
//                   data_delivery_status = 0;
//                   data_delivery_date = "";
//                 }
//               }

//               //grand total
//               let transfer_discount = 0;
//               if (discount) {
//                 if (discount <= transfer_total) {
//                   transfer_discount = discount;
//                 }
//               }

//               let transfer_delivery = delivery ? delivery : 0;

//               let grand_total =
//                 parseFloat(transfer_total) +
//                 parseFloat(transfer_delivery) -
//                 parseFloat(transfer_discount);

//               //payment status
//               let transfer_payment_types = payment_types
//                 ? JSON?.parse(payment_types)
//                 : "";
//               let transfer_payments = payments ? JSON?.parse(payments) : "";

//               let transfer_paid = 0;
//               let transfer_payment_details = [];
//               if (transfer_payment_types?.length > 0) {
//                 for (value of transfer_payment_types) {
//                   let transfer_payment_id = transfer_payments[value]?.id
//                     ? transfer_payments[value]?.id
//                     : "";
//                   let transfer_payment_amount = transfer_payments[value]?.amount
//                     ? parseFloat(transfer_payments[value]?.amount)
//                     : 0;

//                   transfer_paid =
//                     parseFloat(transfer_paid) +
//                     parseFloat(transfer_payment_amount);

//                   transfer_payment_details?.push({
//                     id: transfer_payment_id,
//                     name: value,
//                     amount: transfer_payment_amount,
//                   });
//                 }
//               }

//               let data_payment_status = payment_status
//                 ? parseFloat(payment_status || 0)
//                 : 0;
//               if (parseFloat(data_payment_status) == 2) {
//                 if (parseFloat(transfer_paid) == parseFloat(grand_total)) {
//                   data_payment_status = 2;
//                 } else if (
//                   parseFloat(transfer_paid) > 0 &&
//                   parseFloat(transfer_paid) < parseFloat(grand_total)
//                 ) {
//                   data_payment_status = 1;
//                 } else {
//                   transfer_payment_details = [];
//                   data_payment_status = 0;
//                 }
//               }

//               selected_transfer.subtotal = transfer_subtotal
//                 ? transfer_subtotal
//                 : 0;
//               selected_transfer.taxamount = transfer_taxamount
//                 ? transfer_taxamount
//                 : 0;
//               selected_transfer.discount = transfer_discount
//                 ? transfer_discount
//                 : 0;
//               selected_transfer.delivery = transfer_delivery
//                 ? transfer_delivery
//                 : 0;
//               selected_transfer.delivery_status = data_delivery_status
//                 ? data_delivery_status
//                 : 0;
//               selected_transfer.delivery_date = data_delivery_date;
//               selected_transfer.payment_status = data_payment_status
//                 ? data_payment_status
//                 : 0;
//               selected_transfer.total = grand_total ? grand_total : 0;

//               const selected_transfer_save = await selected_transfer?.save();

//               success_200(res, "Transfer created");
//             } else {
//               failed_400(res, "Transfer failed");
//             }
//           } else {
//             failed_400(res, "Transfer failed");
//           }
//         }
//       }
//     } else {
//       unauthorized(res);
//     }
//   } catch (errors) {
//     catch_400(res, errors?.message);
//   }
// };

const create_transfer = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) return unauthorized(res);

    const {
      supplier,
      number,
      date,
      due_date,
      details,
      discount,
      delivery,
      delivery_status,
      delivery_date,
      payment_status,
      payment_types,
      payments,
      status,
      branch,
    } = req.body;

    const new_number = await get_next_transfer(req, res, 1000);
    const assigned_number = number || new_number;
    if (!supplier || !assigned_number || !date || !due_date || !details?.length)
      return incomplete_400(res);

    const existing = await transfers.findOne({
      number: assigned_number,
      ref: authorize.ref,
    });
    if (existing) return failed_400(res, "Transfer number exists");

    const transfer = await new transfers({
      supplier,
      number: assigned_number,
      date,
      due_date,
      subtotal: 0,
      taxamount: 0,
      discount: 0,
      delivery: 0,
      delivery_status: 0,
      delivery_date: "",
      payment_status: 0,
      total: 0,
      received: 0,
      status: status || 0,
      ref: authorize.ref,
      branch: branch || authorize.branch,
      created: new Date(),
      created_by: authorize.id,
    }).save();

    const inventoryIds = details.map((d) => d.description);
    const allInventories = await inventories
      .find({ _id: { $in: inventoryIds } })
      .populate({
        path: "product",
        match: { status: 1 },
        populate: { path: "unit" },
      })
      .lean();

    const allUnitDetails = await inventories_units_details
      .find({ inventory: { $in: inventoryIds } })
      .lean();

    let transferDetails = [],
      unitDetails = [],
      inventoryOps = [],
      unitOps = [];
    let subtotal = 0,
      taxamount = 0,
      total = 0,
      deliveryCount = 0;

    for (const item of details) {
      const inventory = allInventories.find(
        (inv) => inv._id.toString() === item.description
      );
      const unitList = allUnitDetails.filter(
        (u) => u.inventory.toString() === item.description
      );
      const selectedUnit = unitList.find((u) => u._id.toString() === item.unit);

      const isMain = inventory._id.toString() === item.unit;
      const qty = parseFloat(item.quantity || 0);
      const free = parseFloat(item.free || 0);
      const delivered = Math.min(parseFloat(item.delivered || 0), qty + free);
      const purchasePrice = isMain
        ? inventory.purchase_price
        : selectedUnit?.purchase_price || 0;
      const tax = inventory.tax || 0;
      const price = qty * purchasePrice;
      const taxAmt = price * (tax / 100);
      const itemTotal = price + taxAmt;
      subtotal += price;
      taxamount += taxAmt;
      total += itemTotal;
      if (qty + free === delivered) deliveryCount++;

      const transferDetail = {
        transfer: transfer._id,
        description: inventory._id,
        name: inventory.product?.name || "",
        unit: item.unit,
        unit_name: item.unit_name || "",
        sale_price: isMain
          ? inventory.sale_price
          : selectedUnit?.sale_price || 0,
        purchase_price: purchasePrice,
        conversion: isMain ? inventory.conversion : selectedUnit?.conversion,
        quantity: qty,
        delivered,
        free,
        tax,
        barcode: inventory.barcode,
        price_per_unit: isMain
          ? inventory.price_per_unit
          : selectedUnit?.price_per_unit,
        expiry_date: inventory.expiry_date,
        tax_amount: taxAmt,
        total: itemTotal,
        status: status || 0,
        ref: authorize.ref,
        branch: branch || authorize.branch,
        created: new Date(),
        created_by: authorize.id,
      };
      transferDetails.push(transferDetail);
    }

    const insertedDetails = await transfers_details.insertMany(transferDetails);

    for (let i = 0; i < details.length; i++) {
      const item = details[i];
      const detail = insertedDetails[i];
      const unitList = allUnitDetails.filter(
        (u) => u.inventory.toString() === item.description
      );
      const inventory = allInventories.find(
        (inv) => inv._id.toString() === item.description
      );

      for (const unit of unitList) {
        const isSelected = unit._id.toString() === item.unit;
        const conv = parseFloat(unit.conversion || 1);
        const qty = parseFloat(item.quantity || 0);
        const delivered = parseFloat(item.delivered || 0);
        const unitDelivered = isSelected ? delivered : delivered * conv;

        unitDetails.push({
          details: detail._id,
          inventory_unit: unit._id,
          name: unit.name,
          quantity: qty * conv,
          purchase_price: unit.price_per_unit,
          price_per_unit: unit.price_per_unit,
          sale_price: unit.sale_price,
          conversion: unit.conversion,
          unit_quantity: qty * conv,
          unit_delivered: unitDelivered,
          status: status || 0,
          ref: authorize.ref,
          branch: branch || authorize.branch,
          created: new Date(),
          created_by: authorize.id,
        });

        unitOps.push({
          updateOne: {
            filter: { _id: unit._id },
            update: { $inc: { stock: -unitDelivered } },
          },
        });
      }

      const isMain = inventory._id.toString() === item.unit;
      const delivered = parseFloat(item.delivered || 0);
      const stockChange = isMain
        ? -delivered
        : -(
            delivered /
            (unitList.find((u) => u._id.toString() === item.unit)?.conversion ||
              1)
          );

      inventoryOps.push({
        updateOne: {
          filter: { _id: inventory._id },
          update: { $inc: { stock: stockChange } },
        },
      });
    }

    await transfers_units_details.insertMany(unitDetails);
    await Promise.all([
      inventoryOps.length && inventories.bulkWrite(inventoryOps),
      unitOps.length && inventories_units_details.bulkWrite(unitOps),
    ]);

    // Delivery and Payment status
    const allDelivered = deliveryCount === details.length;
    let deliveryStatus = delivery_status || 0;
    if (delivery_status === 2) {
      deliveryStatus = allDelivered ? 2 : deliveryCount > 0 ? 1 : 0;
    }

    let discountAmount = discount && discount <= total ? discount : 0;
    let deliveryCost = delivery || 0;
    let grandTotal = total + deliveryCost - discountAmount;

    let paymentParsed = JSON.parse(payment_types || "[]");
    let paymentValues = JSON.parse(payments || "{}");
    let paid = 0;
    let paymentDetails = [];

    for (let type of paymentParsed) {
      let amt = parseFloat(paymentValues[type]?.amount || 0);
      paid += amt;
      paymentDetails.push({
        id: paymentValues[type]?.id,
        name: type,
        amount: amt,
      });
    }

    let paymentStat = payment_status || 0;
    if (payment_status === 2) {
      if (paid === grandTotal) paymentStat = 2;
      else if (paid > 0 && paid < grandTotal) paymentStat = 1;
      else (paymentDetails = []), (paymentStat = 0);
    }

    transfer.subtotal = subtotal;
    transfer.taxamount = taxamount;
    transfer.discount = discountAmount;
    transfer.delivery = deliveryCost;
    transfer.delivery_status = deliveryStatus;
    transfer.delivery_date = deliveryStatus === 2 ? delivery_date : "";
    transfer.payment_status = paymentStat;
    transfer.total = grandTotal;
    await transfer.save();

    success_200(res, "Transfer created");
  } catch (err) {
    catch_400(res, err.message);
  }
};

const update_transfer = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      failed_400(res, "Transfer already completed");
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_transfer = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_transfer = await transfers?.findById(id);

        if (!selected_transfer || selected_transfer?.status == 2) {
          failed_400(res, "Transfer Order not found");
        } else {
          selected_transfer.status = 2;
          const delete_transfer = await selected_transfer?.save();

          success_200(res, "Transfer Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_transfer = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_transfer = await transfers
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_transfer || selected_transfer?.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          //   const selected_transfers_payments = await transfers_payments?.find({
          //     transfer: selected_transfer?._id,
          //   });

          const selected_transfer_details = await transfers_details
            ?.find({
              transfer: selected_transfer?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let transfer_details_and_units = [];

          for (value of selected_transfer_details) {
            let details = value?.toObject();

            let selected_inventory_unit_details =
              await inventories_units_details?.find({
                inventory: value?.description?._id,
              });

            const selected_transfer_details_units =
              await transfers_units_details?.find({
                details: value?._id,
              });
            // ?.sort({ created: 1 });

            transfer_details_and_units?.push({
              ...details,
              unit_details_options: selected_transfer_details_units,
              inventory_unit_details: selected_inventory_unit_details,
            });
          }

          const transferData = selected_transfer?.toObject();

          success_200(res, "", {
            ...transferData,
            // payments: selected_transfers_payments,
            details: transfer_details_and_units,
          });
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_transfers = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      supplier,
      contractor,
      status,
      date,
      due_date,
      sort,
      page,
      limit,
    } = req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    const transfersList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      transfersList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (supplier) transfersList.supplier = supplier;
    if (contractor) transfersList.contractor = contractor;
    if (status == 0) transfersList.status = status;

    if (date?.start && date?.end) {
      let startDate = new Date(date.start);
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date(date.end);
      endDate.setHours(23, 59, 59, 999);

      transfersList.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Set sorting options
    let sortOption = { created: -1 };
    if (sort == 0) {
      sortOption = { total: 1 };
    } else if (sort == 1) {
      sortOption = { total: -1 };
    }

    // Get total count for pagination metadata
    const totalCount = await transfers.countDocuments(transfersList);

    // Fetch paginated data
    const paginated_transfers = await transfers
      .find(transfersList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("supplier");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_transfers,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_transfers_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, supplier, contractor, status, date, due_date, sort } =
        req?.body;

      const transfersList = { branch: authorize?.branch };
      transfersList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (transfersList.$or = [{ number: { $regex: search, $options: "i" } }]);
      supplier && (transfersList.supplier = supplier);
      contractor && (transfersList.supplier = contractor);
      status == 0 && (transfersList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        transfersList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        transfersList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_transfers = await transfers_details
        .find(transfersList)
        .sort(sortOption);
      // ?.populate("supplier");

      success_200(res, "", all_transfers);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_transfer_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_transfer_log = await transfers_log?.findById(id);

        if (!selected_transfer_log) {
          failed_400(res, "transfer not found");
        } else {
          success_200(res, "", selected_transfer_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_transfers_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { transfer } = req?.body;

      if (!transfer) {
        incomplete_400(res);
      } else {
        const all_transfers_log = await transfers_log?.find({
          transfer: transfer,
        });
        success_200(res, "", all_transfers_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_transfer_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_transfer_detail = await transfers_details
          .find({ description: id, status: 1 })
          .populate({
            path: "transfer",
            match: { status: 1 },
            populate: { path: "supplier" },
          });

        selected_transfer_detail.sort((a, b) => {
          const dateA = new Date(a.transfer?.date);
          const dateB = new Date(b.transfer?.date);
          return dateB - dateA;
        });

        success_200(res, "", selected_transfer_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_transfer,
  update_transfer,
  delete_transfer,
  get_transfer,
  get_all_transfers,
  get_all_transfers_details,
  get_all_transfer_details,
  get_transfer_log,
  get_all_transfers_log,
};
