const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const requests = require("../Models/requests");
const products = require("../Models/products");
const requests_details = require("../Models/requests_details");
const product_units_details = require("../Models/product_units_details");
const requests_units_details = require("../Models/requests_units_details");

const get_next_request = async (req, res, number) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const total_request = await requests.countDocuments({
        // branch: authorize?.branch,
        ref: authorize?.ref,
      });

      const next_request_number = number + total_request;

      const existing_request_number = await requests.findOne({
        number: next_request_number,
        // branch: authorize?.branch,
        ref: authorize?.ref,
      });

      if (existing_request_number) {
        return await get_next_request(req, res, next_request_number);
      } else {
        return next_request_number;
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_request = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (authorize) {
      const { supplier, number, date, details, branch, status } = req?.body;

      let new_number = await get_next_request(req, res, 1000);
      let assigned_number = number ? number : new_number;

      if (!supplier || !assigned_number || !date || !details?.length > 0) {
        incomplete_400(res);
      } else {
        const selected_request_number = await requests?.findOne({
          number: assigned_number,
          // branch: branch ? branch : authorize?.branch,
          ref: authorize?.ref,
          status: 1,
        });

        if (selected_request_number) {
          failed_400(res, "Request number exists");
        } else {
          //create request order
          const request = new requests({
            supplier: supplier,
            number: assigned_number,
            date: date,
            status: status ? status : 0,
            ref: authorize?.ref,
            branch: branch ? branch : authorize?.branch,
            created: new Date(),
            created_by: authorize?.id,
          });

          const request_save = await request?.save();

          //request order details
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
                let request_unit = value?.unit ? value?.unit : "";
                let request_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let request_conversion = value?.conversion
                  ? value?.conversion
                  : 0;
                let request_quantity = value?.quantity ? value?.quantity : 0;

                //request order details
                const request_detail = new requests_details({
                  request: request_save?._id,
                  description: selected_product?._id,
                  name: selected_product?.name,
                  unit: request_unit,
                  unit_name: request_unit_name,
                  conversion: request_conversion,
                  quantity: request_quantity,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                const request_detail_save = await request_detail?.save();

                const selected_product_units_detail =
                  await product_units_details
                    ?.find({
                      product: selected_product?._id,
                    })
                    ?.populate("name");

                //request order unit details
                if (selected_product_units_detail?.length > 0) {
                  for (v of selected_product_units_detail) {
                    if (v?._id != value?.unit) {
                      const request_unit_detail = new requests_units_details({
                        details: request_detail_save?._id,
                        name: v?.name?.name,
                        quantity: v?.quantity,
                        conversion: v?.conversion,
                        unit_quantity: request_quantity
                          ? parseFloat(v?.conversion) *
                            parseFloat(request_quantity)
                          : 0,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });

                      const request_unit_detail_save =
                        request_unit_detail?.save();
                    }
                  }
                }

                count++;
              }
            }

            //total update
            if (count == details?.length) {
              success_200(res, "Request order created");
            } else {
              failed_400(res, "Request failed");
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

const update_request = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id, supplier, number, date, details, branch, status } = req?.body;

      if (!id || !supplier || !date || !details?.length > 0) {
        incomplete_400(res);
      } else {
        const selected_request = await requests?.findById(id);

        if (!selected_request || selected_request?.status == 2) {
          failed_400(res, "Request Order not found");
        } else {
          //order calculations
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
                let request_unit = value?.unit ? value?.unit : "";
                let request_unit_name = value?.unit_name
                  ? value?.unit_name
                  : "";
                let request_conversion = value?.conversion
                  ? value?.conversion
                  : 0;
                let request_quantity = value?.quantity ? value?.quantity : 0;

                //request order details update
                if (value?.id) {
                  const selected_request_detail =
                    await requests_details?.findById(value?.id);

                  if (selected_request_detail) {
                    selected_request_detail.description = selected_product?._id;
                    selected_request_detail.name = selected_product?.name;
                    selected_request_detail.unit = request_unit;
                    selected_request_detail.unit_name = request_unit_name;
                    selected_request_detail.conversion = request_conversion;
                    selected_request_detail.quantity = request_quantity;

                    const selected_request_details_save =
                      await selected_request_detail?.save();

                    const selected_requests_units_details =
                      await requests_units_details?.findOne({
                        details: selected_request_detail?._id,
                      });

                    if (selected_requests_units_details) {
                      selected_requests_units_details.unit_quantity =
                        request_quantity
                          ? parseFloat(
                              selected_requests_units_details?.conversion
                            ) * parseFloat(request_quantity)
                          : 0;

                      const selected_requests_units_details_save =
                        selected_requests_units_details?.save();
                    }
                  }
                } else {
                  const request_detail = new requests_details({
                    request: selected_request?._id,
                    description: selected_product?._id,
                    name: selected_product?.name,
                    unit: request_unit,
                    unit_name: request_unit_name,
                    conversion: request_conversion,
                    quantity: request_quantity,
                    status: status ? status : 0,
                    ref: authorize?.ref,
                    branch: branch ? branch : authorize?.branch,
                    created: new Date(),
                    created_by: authorize?.id,
                  });

                  const request_detail_save = await request_detail?.save();

                  const selected_product_units_detail =
                    await product_units_details
                      ?.find({
                        product: selected_product?._id,
                      })
                      ?.populate("name");

                  //request order unit details
                  if (selected_product_units_detail?.length > 0) {
                    for (v of selected_product_units_detail) {
                      if (v?._id != value?.unit) {
                        const request_unit_detail = new requests_units_details({
                          details: request_detail_save?._id,
                          name: v?.name?.name,
                          quantity: v?.quantity,
                          conversion: v?.conversion,
                          unit_quantity: request_quantity
                            ? parseFloat(v?.conversion) *
                              parseFloat(request_quantity)
                            : 0,
                          status: status ? status : 0,
                          ref: authorize?.ref,
                          branch: branch ? branch : authorize?.branch,
                          created: new Date(),
                          created_by: authorize?.id,
                        });

                        const request_unit_detail_save =
                          request_unit_detail?.save();
                      }
                    }
                  }
                }

                count++;
              }
            }

            //total update
            if (count == details?.length) {
              if (selected_request) {
                //request order update
                selected_request.supplier = supplier;
                selected_request.date = date;
                selected_request.status = status ? status : 0;

                const selected_request_save = await selected_request?.save();

                success_200(res, "Request order updated");
              } else {
                failed_400("Request not found");
              }
            } else {
              failed_400(res, "Request failed");
            }
          } else {
            failed_400(res, "Details missing");
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

const delete_request = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_request = await requests?.findById(id);

        if (!selected_request || selected_request?.status == 2) {
          failed_400(res, "Request Order not found");
        } else {
          const request_log = new requests_log({
            request: id,
            branch: selected_request?.branch,
            number: selected_request?.number,
            date: selected_request?.date,
            due_date: selected_request?.due_date,
            subtotal: selected_request?.subtotal,
            taxamount: selected_request?.taxamount,
            discount: selected_request?.discount,
            delivery: selected_request?.delivery,
            delivery_status: selected_request?.delivery_status,
            delivery_date: selected_request?.delivery_date,
            payment_status: selected_request?.payment_status,
            payment_types: selected_request?.payment_types,
            payments: selected_request?.payments,
            paid: selected_request?.paid,
            remaining: selected_request?.remaining,
            total: selected_request?.total,
            status: selected_request?.status,
            ref: selected_request?.ref,
            branch: selected_request?.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });
          const request_log_save = await request_log?.save();

          selected_request.status = 2;
          const delete_request = await selected_request?.save();

          success_200(res, "Request Order deleted");
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_request = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_request = await requests
          ?.findById(id)
          ?.populate("supplier")
          ?.populate("branch");

        if (!selected_request || selected_request?.status == 2) {
          failed_400(res, "Request Order not found");
        } else {
          const selected_request_details = await requests_details
            ?.find({
              request: selected_request?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let request_details_and_units = [];

          for (value of selected_request_details) {
            let details = value?.toObject();

            const selected_request_details_units = await requests_units_details
              ?.find({
                details: value?._id,
              })
              ?.sort({ created: 1 });

            request_details_and_units?.push({
              ...details,
              unit_details_options: selected_request_details_units,
            });
          }

          const requestData = selected_request?.toObject();

          success_200(res, "", {
            ...requestData,
            details: request_details_and_units,
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

const get_request_inventories = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_request = await requests
          ?.findById(id)
          ?.populate("branch")
          ?.populate("branch");

        if (!selected_request || selected_request?.status == 2) {
          failed_400(res, "Request Order not found");
        } else {
          const selected_requests_payments = await requests_payments?.find({
            request: selected_request?._id,
          });

          const selected_request_details = await requests_details
            ?.find({
              request: selected_request?._id,
            })
            ?.populate({
              path: "description",
              match: { status: { $ne: 2 } },
            });

          let request_details_and_units = [];

          for (value of selected_request_details) {
            let details = value?.toObject();

            const selected_inventory = await inventories?.findOne({
              detail: value?._id,
            });

            const selected_request_details_units = await requests_units_details
              ?.find({
                details: value?._id,
              })
              ?.sort({ created: 1 });

            request_details_and_units?.push({
              ...details,
              description: {
                _id: selected_inventory?._id,
                number: selected_inventory?.number,
                expiry_date: selected_inventory?.expiry_date,
                stock: selected_inventory?.stock,
              },
              unit_details_options: selected_request_details_units,
            });
          }

          const requestData = selected_request?.toObject();

          success_200(res, "", {
            ...requestData,
            payments: selected_requests_payments,
            details: request_details_and_units,
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

const get_all_requests = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      branch,
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

    const requestsList = {
      branch: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      requestsList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (branch) requestsList.branch = branch;
    if (contractor) requestsList.contractor = contractor;
    if (status == 0) requestsList.status = status;

    if (date?.start && date?.end) {
      requestsList.date = {
        $gte: new Date(date?.start),
        $lte: new Date(date?.end),
      };
    }

    if (due_date?.start && due_date?.end) {
      requestsList.due_date = {
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
    const totalCount = await requests.countDocuments(requestsList);

    // Fetch paginated data
    const paginated_requests = await requests
      .find(requestsList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("supplier");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_requests,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_requested = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (!authorize) {
      return unauthorized(res);
    }

    const {
      search,
      branch,
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

    const requestsList = {
      supplier: authorize?.branch,
      status: { $ne: 2 },
    };

    // Apply filters based on request body
    if (search) {
      requestsList.$or = [{ number: { $regex: search, $options: "i" } }];
    }
    if (branch) requestsList.branch = branch;
    if (contractor) requestsList.contractor = contractor;
    if (status == 0) requestsList.status = status;

    if (date?.start && date?.end) {
      requestsList.date = {
        $gte: new Date(date?.start),
        $lte: new Date(date?.end),
      };
    }

    if (due_date?.start && due_date?.end) {
      requestsList.due_date = {
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
    const totalCount = await requests.countDocuments(requestsList);

    // Fetch paginated data
    const paginated_requests = await requests
      .find(requestsList)
      .sort(sortOption)
      .skip((page_number - 1) * page_limit)
      .limit(page_limit)
      .populate("branch");

    const totalPages = Math.ceil(totalCount / page_limit);

    success_200(res, "", {
      currentPage: page_number,
      totalPages,
      totalCount,
      data: paginated_requests,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  create_request,
  update_request,
  delete_request,
  get_request,
  get_request_inventories,
  get_all_requests,
  get_all_requested,
};
