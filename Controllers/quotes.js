const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const quotes = require("../Models/quotes");
const products = require("../Models/products");
const quotes_details = require("../Models/quotes_details");
const product_units_details = require("../Models/product_units_details");
const quotes_units_details = require("../Models/quotes_units_details");

const get_next_quote = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_quote = await quotes.countDocuments({
        branch: authorize?.branch,
      });

      const next_quote_number = number + total_quote;

      const existing_quote_number = await quotes.findOne({
        number: next_quote_number,
        branch: authorize?.branch,
      });

      if (existing_quote_number) {
        return await get_next_quote(req, res, next_quote_number);
      } else {
        return next_quote_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_quote = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const {
        customer,
        number,
        date,
        due_date,
        details,
        discount,
        delivery,
        delivery_status,
        status,
        branch,
      } = req?.body;

      let new_number = await get_next_quote(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (
        !customer ||
        !assigned_number ||
        !date ||
        !due_date ||
        !details?.length > 0
      ) {
        incomplete_400(res);
      } else {
        const selected_quote_number = await quotes?.findOne({
          number: assigned_number,
          branch: branch ? branch : authorize?.branch,
          status: 1,
        });

        if (selected_quote_number) {
          failed_400(res, "Quote number exists");
        } else {
          //create quote order
          const quote = new quotes({
            customer: customer,
            number: assigned_number,
            date: date,
            due_date: due_date,
            subtotal: 0,
            taxamount: 0,
            discount: 0,
            delivery: 0,
            delivery_status: delivery_status,
            total: 0,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const quote_save = await quote?.save();

          //quote order details
          let quote_subtotal = 0;
          let quote_taxamount = 0;
          let quote_total = 0;
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
                let quote_unit = value?.unit ? value?.unit : "";
                let quote_unit_name = value?.unit_name ? value?.unit_name : "";
                let quote_summary = value?.summary ? value?.summary : "";
                let purchase_price = value?.purchase_price
                  ? value?.purchase_price
                  : 0;
                let quote_conversion = value?.conversion
                  ? value?.conversion
                  : 0;
                let quote_quantity = value?.quantity ? value?.quantity : 0;
                let quote_free = value?.free ? value?.free : 0;
                let quote_tax = value?.tax ? value?.tax : 0;
                let quote_barcode = value?.barcode ? value?.barcode : "";
                let purchase_price_per_unit = 0;
                let quote_sale_price = value?.sale_price
                  ? value?.sale_price
                  : 0;
                let quote_expiry_date = value?.expiry_date
                  ? value?.expiry_date
                  : "";

                let price =
                  parseFloat(quote_quantity) * parseFloat(purchase_price);
                let tax_amount =
                  parseFloat(price) * (parseFloat(quote_tax) / 100);
                let total = parseFloat(price) + parseFloat(tax_amount);

                let total_quantity =
                  parseFloat(quote_quantity) + parseFloat(quote_free);
                quote_quantity =
                  parseFloat(quote_quantity) <= parseFloat(total_quantity)
                    ? quote_quantity
                    : total_quantity;
                purchase_price_per_unit =
                  parseFloat(total) / parseFloat(total_quantity);

                //quote order details
                const quote_detail = new quotes_details({
                  quote: quote_save?._id,
                  description: selected_product?._id,
                  summary: quote_summary,
                  name: selected_product?.name,
                  unit: quote_unit,
                  unit_name: quote_unit_name,
                  purchase_price: purchase_price,
                  conversion: quote_conversion,
                  quantity: quote_quantity,
                  free: quote_free,
                  tax: quote_tax,
                  barcode: quote_barcode,
                  price_per_unit: purchase_price_per_unit,
                  sale_price: quote_sale_price,
                  expiry_date: quote_expiry_date,
                  tax_amount: tax_amount,
                  total: total,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                const quote_detail_save = await quote_detail?.save();

                quote_subtotal = parseFloat(quote_subtotal) + parseFloat(price);
                quote_taxamount =
                  parseFloat(quote_taxamount) + parseFloat(tax_amount);
                quote_total = parseFloat(quote_total) + parseFloat(total);

                count++;
              }
            }

            //total update
            if (count == details?.length) {
              const selected_quote = await quotes?.findById(quote_save?._id);

              if (selected_quote) {
                //grand total
                let quote_discount = 0;
                if (discount) {
                  if (discount <= quote_total) {
                    quote_discount = discount;
                  }
                }
                let quote_delivery = delivery ? delivery : 0;

                let grand_total =
                  parseFloat(quote_total) +
                  parseFloat(quote_delivery) -
                  parseFloat(quote_discount);

                selected_quote.subtotal = quote_subtotal ? quote_subtotal : 0;
                selected_quote.taxamount = quote_taxamount
                  ? quote_taxamount
                  : 0;
                selected_quote.discount = quote_discount ? quote_discount : 0;
                selected_quote.delivery = quote_delivery ? quote_delivery : 0;

                selected_quote.total = grand_total ? grand_total : 0;

                const selected_quote_save = await selected_quote?.save();

                success_200(res, "Quote order created");
              } else {
                failed_400("Quote not found");
              }
            } else {
              failed_400(res, "Quote failed");
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

const update_quote = async (req, res) => {
  success_200(res, "Quote updated");
};

const delete_quote = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_quote = await quotes?.findById(id);

        if (!selected_quote || selected_quote?.status == 2) {
          failed_400(res, "Quote Order not found");
        } else {
          selected_quote.status = 2;
          const delete_quote = await selected_quote?.save();

          success_200(res, "Quote Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_quote = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_quote = await quotes
          ?.findById(id)
          ?.populate("customer")
          ?.populate("branch");

        if (!selected_quote || selected_quote?.status == 2) {
          failed_400(res, "Quote Order not found");
        } else {
          const selected_quote_details = await quotes_details
            ?.find({
              quote: selected_quote?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let quote_details_and_units = [];

          for (value of selected_quote_details) {
            let details = value?.toObject();

            const selected_quote_details_units = await quotes_units_details
              ?.find({
                details: value?._id,
              })
              ?.sort({ created: 1 });

            quote_details_and_units?.push({
              ...details,
              unit_details_options: selected_quote_details_units,
            });
          }

          const quoteData = selected_quote?.toObject();

          success_200(res, "", {
            ...quoteData,
            details: quote_details_and_units,
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

const get_all_quotes = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      customer,
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

    const quotesList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      quotesList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (customer) quotesList.customer = customer;
    if (contractor) quotesList.contractor = contractor;
    if (status == 0) quotesList.status = status;

    if (date?.start && date?.end) {
      quotesList.date = {
        $gte: new Date(date?.start),
        $lte: new Date(date?.end),
      };
    }

    if (due_date?.start && due_date?.end) {
      quotesList.due_date = {
        $gte: new Date(due_date?.start),
        $lte: new Date(due_date?.end),
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
    const totalCount = await quotes.countDocuments(quotesList);

    // Fetch paginated data
    const paginated_quotes = await quotes
      .find(quotesList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("customer");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_quotes,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_quotes_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { search, customer, contractor, status, date, due_date, sort } =
        req?.body;

      const quotesList = { branch: authorize?.branch };
      quotesList.status = { $ne: 2 };

      // Apply filters based on request body
      search &&
        (quotesList.$or = [{ number: { $regex: search, $options: "i" } }]);
      customer && (quotesList.customer = customer);
      contractor && (quotesList.customer = contractor);
      status == 0 && (quotesList.status = status);

      // Set sorting options
      let sortOption = { created: -1 };
      if (sort == 0) {
        sortOption = { total: 1 };
      } else if (sort == 1) {
        sortOption = { total: -1 };
      }

      if (date?.start && date?.end) {
        quotesList.date = {
          $gte: new Date(date?.start),
          $lte: new Date(date?.end),
        };
      }

      // due_date
      if (due_date?.start && due_date?.end) {
        quotesList.due_date = {
          $gte: new Date(due_date?.start),
          $lte: new Date(due_date?.end),
        };
      }

      const all_quotes = await quotes_details.find(quotesList).sort(sortOption);
      // ?.populate("customer");

      success_200(res, "", all_quotes);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_quote_details = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_quote_detail = await quotes_details
          .find({ description: id, status: 1 })
          .populate({
            path: "quote",
            match: { status: 1 },
            populate: { path: "customer" },
          });

        selected_quote_detail.sort((a, b) => {
          return a.quote?.sale_price - b.quote?.sale_price;
        });

        success_200(res, "", selected_quote_detail);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_quote,
  update_quote,
  delete_quote,
  get_quote,
  get_all_quotes_details,
  get_all_quotes,
  get_all_quote_details,
};
