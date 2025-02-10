const update_purchase_order = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const {
        id,
        supplier,
        number,
        date,
        due_date,
        details,
        subtotal,
        taxamount,
        discount,
        delivery,
        delivery_status,
        delivery_date,
        payment_status,
        payment_types,
        payments,
        paid,
        remaining,
        total,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_purchase_order(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !id ||
        !supplier ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_purchase_order = await purchase_orders?.findById(id);

        if (!selected_purchase_order || selected_purchase_order?.status == 2) {
          failed_400(res, "Purchase Order not found");
        } else {
          const selected_purchase_order_number = await purchase_orders.findOne({
            _id: { $ne: id },
            number: assigned_number,
            status: 1,
            branch: branch ? branch : authorize?.branch,
          });

          if (selected_purchase_order_number) {
            failed_400(res, "Purchase number exists");
          } else {
            //order calculations
            let purchase_details = [];
            let purchase_subtotal = 0;
            let purchase_taxamount = 0;
            let purchase_total = 0;
            let delivery_count = 0;

            for (value of details) {
              const selected_product = await products
                ?.findById?.(value?.description)
                ?.populate({
                  path: "unit",
                  match: { status: { $ne: 2 } },
                });

              if (selected_product) {
                let purchase_unit = value?.unit ? value?.unit : "";
                let purchase_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let purchase_price = value?.purchase_price
                  ? value?.purchase_price
                  : 0;
                let purchase_conversion = value?.conversion
                  ? value?.conversion
                  : 0;
                let purchase_quantity = value?.quantity ? value?.quantity : 0;
                let purchase_delivered = value?.delivered
                  ? value?.delivered
                  : 0;
                let purchase_free = value?.free ? value?.free : 0;
                let purchase_tax = value?.tax ? value?.tax : 0;
                let purchase_barcode = value?.barcode ? value?.barcode : "";
                let purchase_price_per_unit = 0;
                let purchase_sale_price = value?.sale_price
                  ? value?.sale_price
                  : 0;
                let purchase_expiry_date = value?.expiry_date
                  ? value?.expiry_date
                  : "";

                let price =
                  parseFloat(purchase_quantity) * parseFloat(purchase_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(purchase_tax) / 100);
                let total = parseFloat(price) + parseFloat(tax_amount);

                let total_quantity =
                  parseFloat(purchase_quantity) + parseFloat(purchase_free);
                purchase_delivered =
                  parseFloat(purchase_delivered) <= parseFloat(total_quantity)
                    ? purchase_delivered
                    : total_quantity;
                purchase_price_per_unit =
                  parseFloat(total) / parseFloat(total_quantity);

                if (
                  parseFloat(total_quantity) == parseFloat(purchase_delivered)
                ) {
                  delivery_count++;
                }

                let selected_unit = "";
                let unit_ids = [];

                let purchase_unit_details_options = [];
                let unit_details_options = value?.unit_details_options;

                if (unit_details_options?.length > 0) {
                  if (selected_product?._id == value?.unit) {
                    const selectedDetails = await Promise.all(
                      unit_details_options?.map(async (v, index) => {
                        const selected_product_units_detail =
                          await product_units_details
                            ?.findById(v?._id)
                            ?.populate("name");

                        return {
                          // name: selected_product_units_detail?.name,
                          // quantity: selected_product_units_detail?.quantity
                          //   ? selected_product_units_detail?.quantity
                          //   : 0,
                          name: v?.name,
                          quantity: v?.quantity ? v?.quantity : 0,
                          price_per_unit: purchase_price_per_unit
                            ? parseFloat(purchase_price_per_unit) /
                              parseFloat(v?.conversion)
                            : 0,
                          conversion: v?.conversion ? v?.conversion : 0,
                          sale_price: v?.sale_price ? v?.sale_price : 0,
                          unit_quantity: total_quantity
                            ? parseFloat(v?.conversion) *
                              parseFloat(total_quantity)
                            : 0,
                          unit_delivered: purchase_delivered
                            ? parseFloat(v?.conversion) *
                              parseFloat(purchase_delivered)
                            : 0,
                        };
                      })
                    );

                    purchase_unit_details_options = [...selectedDetails];
                  } else {
                    for (value of unit_details_options) {
                      unit_ids?.push(value?._id);
                    }

                    if (unit_ids?.includes(value?.unit)) {
                      selected_unit =
                        unit_details_options?.[unit_ids?.indexOf(value?._id)];

                      purchase_unit = selected_unit?.name?.name;
                      purchase_conversion = selected_unit?.conversion;

                      if (
                        purchase_conversion &&
                        parseFloat(purchase_quantity) +
                          parseFloat(purchase_free) >=
                          purchase_conversion
                      ) {
                        purchase_conversion =
                          parseFloat(purchase_conversion) - 1;
                      }
                    }
                  }
                }

                purchase_details?.push({
                  description: selected_product?._id,
                  name: selected_product?.name,
                  unit: purchase_unit,
                  unit_name: purchase_unit_name,
                  unit_details_options: purchase_unit_details_options,
                  purchase_price: purchase_price,
                  conversion: purchase_conversion,
                  quantity: purchase_quantity,
                  delivered: purchase_delivered,
                  free: purchase_free,
                  tax: purchase_tax,
                  barcode: purchase_barcode,
                  price_per_unit: purchase_price_per_unit,
                  sale_price: purchase_sale_price,
                  expiry_date: purchase_expiry_date,
                  tax_amount: tax_amount,
                  total: total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                purchase_subtotal =
                  parseFloat(purchase_subtotal) + parseFloat(price);
                purchase_taxamount =
                  parseFloat(purchase_taxamount) + parseFloat(tax_amount);
                purchase_total = parseFloat(purchase_total) + parseFloat(total);
              }
            }

            if (details?.length === purchase_details?.length) {
              //delivery status
              let data_delivery_status = delivery_status
                ? parseFloat(delivery_status || 0)
                : 0;
              let data_delivery_date = delivery_date ? delivery_date : "";
              if (parseFloat(data_delivery_status) == 2) {
                if (parseFloat(delivery_count) == purchase_details?.length) {
                  data_delivery_status = 2;
                } else if (
                  parseFloat(delivery_count) > 0 &&
                  parseFloat(delivery_count) < purchase_details?.length
                ) {
                  data_delivery_status = 1;
                  data_delivery_date = "";
                } else {
                  data_delivery_status = 0;
                  data_delivery_date = "";
                }
              }

              //grand total
              let purchase_discount = 0;
              if (discount) {
                if (discount <= purchase_total) {
                  purchase_discount = discount;
                }
              }
              let purchase_delivery = delivery ? delivery : 0;
              let grand_total =
                parseFloat(purchase_total) +
                parseFloat(purchase_delivery) -
                parseFloat(purchase_discount);

              //payment status
              let purchase_payment_types = payment_types
                ? JSON?.parse(payment_types)
                : "";
              let purchase_payments = payments ? JSON?.parse(payments) : "";
              let purchase_paid = 0;
              let purchase_order_payment_details = [];
              if (purchase_payment_types?.length > 0) {
                for (value of purchase_payment_types) {
                  let purchase_payment_id = purchase_payments[value]?.id
                    ? purchase_payments[value]?.id
                    : "";
                  let purchase_payment_amount = purchase_payments[value]?.amount
                    ? parseFloat(purchase_payments[value]?.amount)
                    : 0;
                  purchase_paid =
                    parseFloat(purchase_paid) +
                    parseFloat(purchase_payment_amount);
                  purchase_order_payment_details?.push({
                    id: purchase_payment_id,
                    name: value,
                    amount: purchase_payment_amount,
                  });
                }
              }
              let data_payment_status = payment_status
                ? parseFloat(payment_status || 0)
                : 0;
              if (parseFloat(data_payment_status) == 2) {
                if (parseFloat(purchase_paid) == parseFloat(grand_total)) {
                  data_payment_status = 2;
                } else if (
                  parseFloat(purchase_paid) > 0 &&
                  parseFloat(purchase_paid) < parseFloat(grand_total)
                ) {
                  data_payment_status = 1;
                } else {
                  purchase_order_payment_details = [];
                  data_payment_status = 0;
                }
              }

              //order logs
              // const purchase_order_log = new purchase_orders_log({
              //   purchase: selected_purchase_order?._id,
              //   supplier: selected_purchase_order?.supplier,
              //   number: selected_purchase_order?.number,
              //   date: selected_purchase_order?.date,
              //   due_date: selected_purchase_order?.due_date,
              //   subtotal: selected_purchase_order?.subtotal,
              //   taxamount: selected_purchase_order?.taxamount,
              //   discount: selected_purchase_order?.discount,
              //   delivery: selected_purchase_order?.delivery,
              //   delivery_status: selected_purchase_order?.delivery_status,
              //   delivery_date: selected_purchase_order?.delivery_date,
              //   payment_status: selected_purchase_order?.payment_status,
              //   total: selected_purchase_order?.total,
              //   status: selected_purchase_order?.status,
              //   ref: selected_purchase_order?.ref,
              //   branch: selected_purchase_order?.branch,
              //   updated: new Date(),
              //   updated_by: authorize?.id,
              // });
              // const purchase_order_log_save = await purchase_order_log?.save();

              //order payment logs
              // const selected_purchase_order_payments =
              //   await purchase_orders_payments?.find({
              //     purchase: selected_purchase_order?._id,
              //   });
              // if (selected_purchase_order_payments?.length > 0) {
              //   for (value of selected_purchase_order_payments) {
              //     const selected_purchase_order_payment =
              //       await purchase_orders_payments?.findById(value?._id);
              //     if (selected_purchase_order_payment) {
              //       const purchase_order_payment_log =
              //         new purchase_orders_payments_log({
              //           purchase_orders_payments:
              //             selected_purchase_order_payment?._id,
              //           purchase: selected_purchase_order_payment?.purchase,
              //           name: selected_purchase_order_payment?.name,
              //           amount: selected_purchase_order_payment?.amount,
              //           status: selected_purchase_order_payment?.status,
              //           ref: selected_purchase_order_payment?.ref,
              //           branch: selected_purchase_order_payment?.branch,
              //           updated: new Date(),
              //           updated_by: authorize?.id,
              //         });
              //       const purchase_order_payment_log_save =
              //         await purchase_order_payment_log?.save();
              //     }
              //   }
              // }

              //order details & details_units & inventory & inventory_unit_details log
              const selected_purchase_orders_details =
                await purchase_orders_details?.find({
                  purchase: selected_purchase_order?._id,
                });

              // if (selected_purchase_orders_details?.length > 0) {
              //   const selected_purchase_details =
              //     await purchase_orders_details?.findById?.(value?._id);
              //   //order details & details_units log
              //   for (value of selected_purchase_orders_details) {
              //     if (selected_purchase_details) {
              //       const purchase_order_detail_log =
              //         new purchase_orders_details_log({
              //           detail: selected_purchase_details?._id,
              //           purchase: selected_purchase_details?.purchase,
              //           description: selected_purchase_details?.description,
              //           name: selected_purchase_details?.name,
              //           unit: selected_purchase_details?.unit,
              //           purchase_price:
              //             selected_purchase_details?.purchase_price,
              //           quantity: selected_purchase_details?.quantity,
              //           delivered: selected_purchase_details?.delivered,
              //           tax: selected_purchase_details?.tax,
              //           total: selected_purchase_details?.total,
              //           status: selected_purchase_details?.status,
              //           ref: selected_purchase_details?.ref,
              //           branch: selected_purchase_details?.branch,
              //           updated: new Date(),
              //           updated_by: authorize?.id,
              //         });
              //       const purchase_order_detail_log_save =
              //         await purchase_order_detail_log?.save();
              //       //order details units log
              //       const selected_purchase_order_details_units =
              //         await purchase_orders_units_details?.find({
              //           details: selected_purchase_details?._id,
              //         });
              //       if (selected_purchase_order_details_units?.length > 0) {
              //         for (v of selected_purchase_order_details_units) {
              //           const selected_purchase_order_units_detail =
              //             await purchase_orders_units_details?.findById(v?._id);
              //           if (selected_purchase_order_units_detail) {
              //             const purchase_order_units_detail_log =
              //               new purchase_orders_units_details_log({
              //                 purchase_orders_units_details:
              //                   selected_purchase_order_units_detail?._id,
              //                 details:
              //                   selected_purchase_order_units_detail?.details,
              //                 name: selected_purchase_order_units_detail?.name,
              //                 quantity:
              //                   selected_purchase_order_units_detail?.quantity,
              //                 price_per_unit:
              //                   selected_purchase_order_units_detail?.price_per_unit,
              //                 sale_price:
              //                   selected_purchase_order_units_detail?.sale_price,
              //                 unit_quantity:
              //                   selected_purchase_order_units_detail?.unit_quantity,
              //                 unit_delivered:
              //                   selected_purchase_order_units_detail?.unit_delivered,
              //                 status:
              //                   selected_purchase_order_units_detail?.status,
              //                 ref: selected_purchase_order_units_detail?.ref,
              //                 branch:
              //                   selected_purchase_order_units_detail?.branch,
              //                 updated: new Date(),
              //                 updated_by: authorize?.id,
              //               });
              //             const purchase_order_units_detail_log_save =
              //               await purchase_order_units_detail_log?.save();
              //           }
              //         }
              //       }

              //       //inventory log
              //       const selected_inventory = await inventories?.findOne({
              //         detail: selected_purchase_details?._id,
              //       });
              //       if (selected_inventory) {
              //         const inventory_log = new inventories_log({
              //           inventory: selected_inventory?._id,
              //           number: selected_inventory?.number,
              //           purchase: selected_inventory?.purchase,
              //           detail: selected_inventory?.detail,
              //           product: selected_inventory?.product,
              //           barcode: selected_inventory?.barcode,
              //           purchase_price: selected_inventory?.purchase_price,
              //           sale_price: selected_inventory?.sale_price,
              //           tax: selected_inventory?.tax,
              //           stock: selected_inventory?.stock,
              //           manufacture_date: selected_inventory?.manufacture_date,
              //           expiry_date: selected_inventory?.expiry_date,
              //           status: selected_inventory?.status,
              //           ref: selected_inventory?.ref,
              //           branch: selected_inventory?.branch,
              //           updated: new Date(),
              //           updated_by: authorize?.id,
              //         });
              //         const inventory_log_save = await inventory_log?.save();

              //         //inventory unit details log
              //         const selected_inventory_unit_details =
              //           await inventories_units_details?.find({
              //             inventory: selected_inventory?._id,
              //           });
              //         if (selected_inventory_unit_details?.length > 0) {
              //           for (v of selected_inventory_unit_details) {
              //             const selected_inventory_unit_detail =
              //               await inventories_units_details?.findById(v?._id);
              //             if (selected_inventory_unit_detail) {
              //               const inventory_unit_detail_log =
              //                 new inventories_units_details_log({
              //                   inventories_units_details:
              //                     selected_inventory_unit_detail?._id,
              //                   inventory:
              //                     selected_inventory_unit_detail?.inventory,
              //                   name: selected_inventory_unit_detail?.name,
              //                   quantity:
              //                     selected_inventory_unit_detail?.quantity,
              //                   price_per_unit:
              //                     selected_inventory_unit_detail?.price_per_unit,
              //                   sale_price:
              //                     selected_inventory_unit_detail?.sale_price,
              //                   unit_quantity:
              //                     selected_inventory_unit_detail?.unit_quantity,
              //                   unit_delivered:
              //                     selected_inventory_unit_detail?.unit_delivered,
              //                   status: selected_inventory_unit_detail?.status,
              //                   ref: selected_inventory_unit_detail?.ref,
              //                   branch: selected_inventory_unit_detail?.branch,
              //                   updated: new Date(),
              //                   updated_by: authorize?.id,
              //                 });
              //               const inventory_unit_detail_log_save =
              //                 await inventory_unit_detail_log?.save();
              //             }
              //           }
              //         }
              //       }
              //     }
              //   }

              //   //order inventory & inventory_unit_details log
              //   for (value of selected_purchase_orders_details) {
              //     if (selected_purchase_details) {
              //       const selected_inventory = await inventories?.findOne({
              //         detail: selected_purchase_details?._id,
              //       });
              //       if (selected_inventory) {
              //         const inventory_log = new inventories_log({
              //           inventory: selected_inventory?._id,
              //           number: selected_inventory?.number,
              //           purchase: selected_inventory?.purchase,
              //           detail: selected_inventory?.detail,
              //           product: selected_inventory?.product,
              //           barcode: selected_inventory?.barcode,
              //           purchase_price: selected_inventory?.purchase_price,
              //           sale_price: selected_inventory?.sale_price,
              //           tax: selected_inventory?.tax,
              //           stock: selected_inventory?.stock,
              //           manufacture_date: selected_inventory?.manufacture_date,
              //           expiry_date: selected_inventory?.expiry_date,
              //           status: selected_inventory?.status,
              //           ref: selected_inventory?.ref,
              //           branch: selected_inventory?.branch,
              //           updated: new Date(),
              //           updated_by: authorize?.id,
              //         });
              //         const inventory_log_save = await inventory_log?.save();
              //         //inventory unit details log
              //         const selected_inventory_unit_details =
              //           await inventories_units_details?.find({
              //             inventory: selected_inventory?._id,
              //           });
              //         if (selected_inventory_unit_details?.length > 0) {
              //           for (v of selected_inventory_unit_details) {
              //             const selected_inventory_unit_detail =
              //               await inventories_units_details?.findById(v?._id);
              //             if (selected_inventory_unit_detail) {
              //               const inventory_unit_detail_log =
              //                 new inventories_units_details_log({
              //                   inventories_units_details:
              //                     selected_inventory_unit_detail?._id,
              //                   inventory:
              //                     selected_inventory_unit_detail?.inventory,
              //                   name: selected_inventory_unit_detail?.name,
              //                   quantity:
              //                     selected_inventory_unit_detail?.quantity,
              //                   price_per_unit:
              //                     selected_inventory_unit_detail?.price_per_unit,
              //                   sale_price:
              //                     selected_inventory_unit_detail?.sale_price,
              //                   unit_quantity:
              //                     selected_inventory_unit_detail?.unit_quantity,
              //                   unit_delivered:
              //                     selected_inventory_unit_detail?.unit_delivered,
              //                   status: selected_inventory_unit_detail?.status,
              //                   ref: selected_inventory_unit_detail?.ref,
              //                   branch: selected_inventory_unit_detail?.branch,
              //                   updated: new Date(),
              //                   updated_by: authorize?.id,
              //                 });
              //               const inventory_unit_detail_log_save =
              //                 await inventory_unit_detail_log?.save();
              //             }
              //           }
              //         }
              //       }
              //     }
              //   }
              // }

              //delete order_details_units
              for (value of selected_purchase_orders_details) {
                const delete_purchase_order_units_details =
                  await purchase_orders_units_details?.deleteOne({
                    details: value?._id,
                  });
              }

              //delete order details
              const delete_purchase_order_details =
                await purchase_orders_details?.deleteMany({
                  purchase: selected_purchase_order?._id,
                });

              //delete inventory_unit_details
              const selected_inventories = await inventories?.find({
                purchase: selected_purchase_order?._id,
              });

              for (value of selected_inventories) {
                const delete_inventories_units_details =
                  await inventories_units_details?.deleteOne({
                    inventory: value?._id,
                  });
              }

              //delete inventories
              const delete_inventories = await inventories?.deleteMany({
                purchase: selected_purchase_order?._id,
              });

              //update order
              selected_purchase_order.supplier = supplier;
              selected_purchase_order.number = assigned_number;
              selected_purchase_order.date = date;
              selected_purchase_order.due_date = due_date;
              selected_purchase_order.subtotal = purchase_subtotal
                ? purchase_subtotal
                : 0;
              selected_purchase_order.taxamount = purchase_taxamount
                ? purchase_taxamount
                : 0;
              selected_purchase_order.discount = purchase_discount
                ? purchase_discount
                : 0;
              selected_purchase_order.delivery = purchase_delivery
                ? purchase_delivery
                : 0;
              selected_purchase_order.delivery_status = data_delivery_status
                ? data_delivery_status
                : 0;
              selected_purchase_order.delivery_date = data_delivery_date;
              selected_purchase_order.payment_status = data_payment_status
                ? data_payment_status
                : 0;
              selected_purchase_order.total = grand_total ? grand_total : 0;
              selected_purchase_order.status = status ? status : 0;
              const selected_purchase_order_save =
                await selected_purchase_order?.save();

              //order payment
              if (purchase_order_payment_details?.length > 0) {
                for (value of purchase_order_payment_details) {
                  const purchase_order_payment = await purchase_orders_payments(
                    {
                      purchase: selected_purchase_order_save?._id,
                      name: value?.name,
                      amount: value?.amount,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    }
                  );
                  const purchase_order_payment_save =
                    await purchase_order_payment?.save();
                }
              }

              //order details
              for (value of purchase_details) {
                const selected_product = await products
                  ?.findById?.(value?.description)
                  ?.populate({
                    path: "unit",
                    match: { status: { $ne: 2 } },
                  });

                if (selected_product) {
                  //inventories
                  let new_number = await get_next_inventories(req, res, 1000);
                  let assigned_innevtory_number = new_number;
                  const selected_inventory_number = await inventories?.findOne({
                    number: assigned_innevtory_number,
                  });

                  if (selected_inventory_number) {
                    failed_400(res, "Inventory not created");
                  } else {
                    const selected_product_units_detail =
                      await product_units_details?.find({
                        product: selected_product?._id,
                      });
                    let inventory_purchase_price = value?.purchase_price
                      ? value?.purchase_price
                      : 0;
                    let inventory_price_per_unit = value?.price_per_unit
                      ? value?.price_per_unit
                      : 0;
                    let inventory_sale_price = value?.sale_price
                      ? value?.sale_price
                      : 0;
                    let inventory_tax = value?.tax ? value?.tax : 0;
                    let inventory_stock = value?.delivered
                      ? value?.delivered
                      : 0;
                    let inventory_unit_details_options =
                      value?.unit_details_options;

                    if (selected_product?._id == value?.unit) {
                      inventory_purchase_price = inventory_purchase_price;
                      inventory_sale_price = inventory_sale_price;
                      inventory_tax = inventory_tax;
                      inventory_stock = inventory_stock;
                      inventory_price_per_unit = inventory_price_per_unit;
                      inventory_unit_details_options =
                        inventory_unit_details_options;
                    } else {
                      inventory_purchase_price = 0;
                      inventory_price_per_unit = 0;
                      inventory_sale_price = 0;
                      inventory_tax = 0;
                      inventory_stock = 0;
                      inventory_unit_details_options =
                        selected_product_units_detail;
                    }

                    const inventory = new inventories({
                      number: assigned_innevtory_number,
                      purchase: selected_purchase_order_save?._id,
                      product: value?.description,
                      purchase_price: inventory_purchase_price,
                      price_per_unit: inventory_price_per_unit,
                      sale_price: inventory_sale_price,
                      tax: inventory_tax,
                      stock: inventory_stock,
                      manufacture_date: value?.manufacture_date,
                      expiry_date: value?.expiry_date,
                      barcode: value?.barcode,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });
                    const inventory_save = await inventory?.save();

                    const purchase_order_detail = new purchase_orders_details({
                      purchase: selected_purchase_order_save?._id,
                      inventory: inventory_save?._id,
                      description: value?.description,
                      name: value?.name,
                      unit: value?.unit,
                      unit_name: value?.unit_name,
                      purchase_price: value?.purchase_price,
                      conversion: value?.conversion,
                      quantity: value?.quantity,
                      delivered: value?.delivered,
                      free: value?.free,
                      tax: value?.tax,
                      type: value?.type,
                      barcode: value?.barcode,
                      price_per_unit: value?.price_per_unit,
                      sale_price: value?.sale_price,
                      expiry_date: value?.expiry_date,
                      tax_amount: value?.tax_amount,
                      total: value?.total,
                      status: status ? status : 0,
                      ref: authorize?.ref,
                      branch: branch ? branch : authorize?.branch,
                      created: new Date(),
                      created_by: authorize?.id,
                    });

                    const purchase_order_detail_save =
                      await purchase_order_detail?.save();

                    //order details units
                    // if (value?.unit_details_options?.length > 0) {
                    //   for (v of value?.unit_details_options) {
                    //     const purchase_order_unit_detail =
                    //       new purchase_orders_units_details({
                    //         details: purchase_order_detail_save?._id,
                    //         name: v?.name,
                    //         quantity: v?.quantity,
                    //         purchase_price: v?.price_per_unit,
                    //         price_per_unit: v?.price_per_unit,
                    //         sale_price: v?.sale_price,
                    //         conversion: v?.conversion,
                    //         unit_quantity: v?.unit_quantity,
                    //         unit_delivered: v?.unit_delivered,
                    //         status: status ? status : 0,
                    //         ref: authorize?.ref,
                    //         branch: branch ? branch : authorize?.branch,
                    //         created: new Date(),
                    //         created_by: authorize?.id,
                    //       });
                    //     const purchase_order_unit_detail_save =
                    //       purchase_order_unit_detail?.save();
                    //   }
                    // }

                    //inventory units details
                    if (inventory_unit_details_options?.length > 0) {
                      for (v of inventory_unit_details_options) {
                        if (v?._id == value?.unit) {
                          const inventories_units_detail =
                            new inventories_units_details({
                              inventory: inventory_save?._id,
                              name: value?.unit_name,
                              conversion: value?.conversion,
                              purchase_price: value?.purchase_price,
                              price_per_unit: value?.price_per_unit,
                              sale_price: value?.sale_price,
                              stock: value?.delivered,
                              status: status ? status : 0,
                              ref: authorize?.ref,
                              branch: branch ? branch : authorize?.branch,
                              created: new Date(),
                              created_by: authorize?.id,
                            });
                          const inventories_units_detail_save =
                            await inventories_units_detail?.save();
                        } else {
                          const inventories_units_detail =
                            new inventories_units_details({
                              inventory: inventory_save?._id,
                              name: v?.name,
                              conversion: v?.conversion,
                              purchase_price: v?.purchase_price,
                              price_per_unit: v?.price_per_unit,
                              sale_price: v?.sale_price,
                              stock: v?.unit_delivered,
                              status: status ? status : 0,
                              ref: authorize?.ref,
                              branch: branch ? branch : authorize?.branch,
                              created: new Date(),
                              created_by: authorize?.id,
                            });
                          const inventories_units_detail_save =
                            await inventories_units_detail?.save();

                          const purchase_order_unit_detail =
                            new purchase_orders_units_details({
                              details: purchase_order_detail_save?._id,
                              inventory_unit:
                                inventories_units_detail_save?._id,
                              name: v?.name,
                              quantity: v?.quantity,
                              purchase_price: v?.price_per_unit,
                              price_per_unit: v?.price_per_unit,
                              sale_price: v?.sale_price,
                              conversion: v?.conversion,
                              unit_quantity: v?.unit_quantity,
                              unit_delivered: v?.unit_delivered,
                              status: status ? status : 0,
                              ref: authorize?.ref,
                              branch: branch ? branch : authorize?.branch,
                              created: new Date(),
                              created_by: authorize?.id,
                            });

                          const purchase_order_unit_detail_save =
                            await purchase_order_unit_detail?.save();
                        }
                      }
                    }
                  }
                }
              }

              success_200(res, "Purchase order updated");
            } else {
              failed_400(res, "Purchase update failed");
            }
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};
