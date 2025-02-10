const create_purchase_order = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
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
      } = req?.body;

      let new_number = await get_next_purchase_order(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !supplier ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_purchase_number = await purchase_orders?.findOne({
          number: assigned_number,
          branch: branch ? branch : authorize?.branch,
          status: 1,
        });

        if (selected_purchase_number) {
          failed_400(res, "Purchase number exists");
        } else {
          //purchase order create
          const purchase_order = new purchase_orders({
            supplier: supplier,
            number: assigned_number,
            date: date,
            due_date: due_date,
            subtotal: 0,
            taxamount: 0,
            discount: 0,
            delivery: 0,
            delivery_status: 0,
            delivery_date: "",
            payment_status: 0,
            total: 0,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const purchase_order_save = await purchase_order?.save();

          //purchase order details
          let purchase_subtotal = 0;
          let purchase_taxamount = 0;
          let purchase_total = 0;
          let delivery_count = 0;
          let count = 0;

          if (details?.length > 0) {
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

                //delivery status count
                if (
                  parseFloat(total_quantity) == parseFloat(purchase_delivered)
                ) {
                  delivery_count++;
                }

                let selected_unit = "";
                let unit_ids = [];

                //unit details
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
                          name: selected_product_units_detail?.name?.name,
                          quantity: selected_product_units_detail?.quantity
                            ? selected_product_units_detail?.quantity
                            : 0,
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

                //inventories create
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
                  let inventory_stock = value?.delivered ? value?.delivered : 0;
                  let inventory_unit_details_options =
                    purchase_unit_details_options;

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
                    purchase: purchase_order_save?._id,
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

                  //purchase order details
                  const purchase_order_detail = new purchase_orders_details({
                    purchase: purchase_order_save?._id,
                    inventory: inventory_save?._id,
                    description: selected_product?._id,
                    name: selected_product?.name,
                    unit: purchase_unit,
                    unit_name: purchase_unit_name,
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

                  const purchase_order_detail_save =
                    await purchase_order_detail?.save();

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
                            purchase_price: v?.price_per_unit,
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

                        //purchase order unit details
                        const purchase_order_unit_detail =
                          new purchase_orders_units_details({
                            details: purchase_order_detail_save?._id,
                            inventory_unit: inventories_units_detail_save?._id,
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
                          purchase_order_unit_detail?.save();
                      }
                    }
                  }
                }

                purchase_subtotal =
                  parseFloat(purchase_subtotal) + parseFloat(price);
                purchase_taxamount =
                  parseFloat(purchase_taxamount) + parseFloat(tax_amount);
                purchase_total = parseFloat(purchase_total) + parseFloat(total);

                count++;
              }
            }

            //total update
            if (count == details?.length) {
              const selected_purchase_order = await purchase_orders?.findById(
                purchase_order_save?._id
              );

              if (selected_purchase_order) {
                //delivery status
                let data_delivery_status = delivery_status
                  ? parseFloat(delivery_status || 0)
                  : 0;
                let data_delivery_date = delivery_date ? delivery_date : "";

                if (parseFloat(data_delivery_status) == 2) {
                  if (parseFloat(delivery_count) == details?.length) {
                    data_delivery_status = 2;
                  } else if (
                    parseFloat(delivery_count) > 0 &&
                    parseFloat(delivery_count) < details?.length
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
                    let purchase_payment_amount = purchase_payments[value]
                      ?.amount
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

                //purchase order payment create
                if (purchase_order_payment_details?.length > 0) {
                  for (value of purchase_order_payment_details) {
                    const purchase_order_payment =
                      await purchase_orders_payments({
                        purchase: purchase_order_save?._id,
                        name: value?.name,
                        amount: value?.amount,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });

                    const purchase_order_payment_save =
                      await purchase_order_payment?.save();
                  }
                }

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

                const selected_purchase_order_save =
                  await selected_purchase_order?.save();

                success_200(res, "Purchase order created");
              } else {
                failed_400("Purchase not found");
              }
            } else {
              failed_400(res, "Purchase failed");
            }
          } else {
            failed_400(res, "Details missing");
          }
        }
      }
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

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
            let purchase_subtotal = 0;
            let purchase_taxamount = 0;
            let purchase_total = 0;
            let delivery_count = 0;
            let count = 0;

            if (details?.length > 0) {
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

                  //delivery status count
                  if (
                    parseFloat(total_quantity) == parseFloat(purchase_delivered)
                  ) {
                    delivery_count++;
                  }

                  let selected_unit = "";
                  let unit_ids = [];

                  let purchase_unit_details_options = [];
                  let unit_details_options = value?.unit_details_options;

                  //unit details main or sub
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

                  //inventories update
                  const selected_inventory = await inventories?.findById(
                    value?.inventory
                  );

                  if (selected_inventory) {
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

                    selected_inventory.product = value?.description;
                    selected_inventory.purchase_price =
                      inventory_purchase_price;
                    selected_inventory.price_per_unit =
                      inventory_price_per_unit;
                    selected_inventory.sale_price = inventory_sale_price;
                    selected_inventory.tax = inventory_tax;
                    selected_inventory.stock = inventory_stock;
                    selected_inventory.manufacture_date =
                      value?.manufacture_date;
                    selected_inventory.expiry_date = value?.expiry_date;
                    selected_inventory.barcode = value?.barcode;

                    const selected_inventory_save =
                      await selected_inventory?.save();

                    //purchase order details update
                    const selected_purchase_order_detail =
                      await purchase_orders_details?.findOne({
                        inventory: selected_inventory?._id,
                      });

                    selected_purchase_order_detail.description =
                      selected_product?._id;
                    selected_purchase_order_detail.name =
                      selected_product?.name;
                    selected_purchase_order_detail.unit = purchase_unit;
                    selected_purchase_order_detail.unit_name =
                      purchase_unit_name;
                    selected_purchase_order_detail.purchase_price =
                      purchase_price;
                    selected_purchase_order_detail.conversion =
                      purchase_conversion;
                    selected_purchase_order_detail.quantity = purchase_quantity;
                    selected_purchase_order_detail.delivered =
                      purchase_delivered;
                    selected_purchase_order_detail.free = purchase_free;
                    selected_purchase_order_detail.tax = purchase_tax;
                    selected_purchase_order_detail.barcode = purchase_barcode;
                    selected_purchase_order_detail.price_per_unit =
                      purchase_price_per_unit;
                    selected_purchase_order_detail.sale_price =
                      purchase_sale_price;
                    selected_purchase_order_detail.expiry_date =
                      purchase_expiry_date;
                    selected_purchase_order_detail.tax_amount = tax_amount;
                    selected_purchase_order_detail.total = total;

                    const selected_purchase_order_details_save =
                      await selected_purchase_order_detail?.save();

                    if (inventory_unit_details_options?.length > 0) {
                      for (v of inventory_unit_details_options) {
                        const selected_inventory_unit_detail =
                          await inventories_units_details?.findOne({
                            inventory: selected_inventory?._id,
                          });

                        if (selected_inventory_unit_detail) {
                          // inventory unit details (if sub unit selected)
                          if (v?._id == value?.unit) {
                            selected_inventory_unit_detail.name =
                              value?.unit_name;
                            selected_inventory_unit_detail.conversion =
                              value?.conversion;
                            selected_inventory_unit_detail.purchase_price =
                              value?.purchase_price;
                            selected_inventory_unit_detail.price_per_unit =
                              value?.price_per_unit;
                            selected_inventory_unit_detail.sale_price =
                              value?.sale_price;
                            selected_inventory_unit_detail.stock =
                              value?.delivered;

                            const selected_inventory_unit_detail_save =
                              await selected_inventory_unit_detail?.save();
                          } else {
                            // inventory unit details (if main unit selected)
                            selected_inventory_unit_detail.name = v?.name;
                            selected_inventory_unit_detail.conversion =
                              v?.conversion;
                            selected_inventory_unit_detail.purchase_price =
                              v?.purchase_price;
                            selected_inventory_unit_detail.price_per_unit =
                              v?.price_per_unit;
                            selected_inventory_unit_detail.sale_price =
                              v?.sale_price;
                            selected_inventory_unit_detail.stock =
                              v?.unit_delivered;

                            const selected_inventory_unit_detail_save =
                              await selected_inventory_unit_detail?.save();

                            //purchase order unit details
                            const selected_purchase_orders_units_detail =
                              await purchase_orders_units_details?.findOne({
                                inventory_unit:
                                  selected_inventory_unit_detail?._id,
                              });

                            if (selected_purchase_orders_units_detail) {
                              selected_purchase_orders_units_detail.name =
                                v?.name;
                              selected_purchase_orders_units_detail.quantity =
                                v?.quantity;
                              selected_purchase_orders_units_detail.purchase_price =
                                v?.price_per_unit;
                              selected_purchase_orders_units_detail.price_per_unit =
                                v?.price_per_unit;
                              selected_purchase_orders_units_detail.sale_price =
                                v?.sale_price;
                              selected_purchase_orders_units_detail.conversion =
                                v?.conversion;
                              selected_purchase_orders_units_detail.unit_quantity =
                                v?.unit_quantity;
                              selected_purchase_orders_units_detail.unit_delivered =
                                v?.unit_delivered;

                              const selected_purchase_orders_units_detail_save =
                                selected_purchase_orders_units_detail?.save();
                            }
                          }
                        }
                      }
                    }

                    purchase_subtotal =
                      parseFloat(purchase_subtotal) + parseFloat(price);
                    purchase_taxamount =
                      parseFloat(purchase_taxamount) + parseFloat(tax_amount);
                    purchase_total =
                      parseFloat(purchase_total) + parseFloat(total);

                    count++;
                  }
                }
              }

              //total update
              if (count == details?.length) {
                if (selected_purchase_order) {
                  //delivery status
                  let data_delivery_status = delivery_status
                    ? parseFloat(delivery_status || 0)
                    : 0;
                  let data_delivery_date = delivery_date ? delivery_date : "";

                  if (parseFloat(data_delivery_status) == 2) {
                    if (parseFloat(delivery_count) == details?.length) {
                      data_delivery_status = 2;
                    } else if (
                      parseFloat(delivery_count) > 0 &&
                      parseFloat(delivery_count) < details?.length
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
                      let purchase_payment_amount = purchase_payments[value]
                        ?.amount
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

                  //purchase order payment update
                  if (purchase_order_payment_details?.length > 0) {
                    for (value of purchase_order_payment_details) {
                      const selected_purchase_order_payment =
                        await purchase_orders_payments?.findById(value?.id);

                      if (selected_purchase_order_payment) {
                        selected_purchase_order_payment.name = value?.name;
                        selected_purchase_order_payment.amount = value?.amount;
                        if (parseFloat(value.status || 0) == 2) {
                          selected_purchase_order_payment.status = 2;
                        }

                        const selected_purchase_order_payment_save =
                          await selected_purchase_order_payment?.save();
                      } else {
                        const purchase_order_payment =
                          await purchase_orders_payments({
                            purchase: selected_purchase_order?._id,
                            name: value?.name,
                            amount: value?.amount,
                            status: status ? status : 0,
                            ref: authorize?.ref,
                            branch: branch ? branch : authorize?.branch,
                            created: new Date(),
                            created_by: authorize?.id,
                          });

                        const purchase_order_payment_save =
                          await purchase_order_payment?.save();
                      }
                    }
                  }

                  //purchase order update
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

                  success_200(res, "Purchase order updated");
                } else {
                  failed_400("Purchase not found");
                }
              } else {
                failed_400(res, "Purchase failed");
              }
            } else {
              failed_400(res, "Details missing");
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
