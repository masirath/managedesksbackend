require("dotenv").config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authorization } = require("../Global/authorization");
const {
  failed_400,
  unauthorized,
  catch_400,
  incomplete_400,
  success_200,
} = require("../Global/errors");
const { checknull } = require("../Global/checknull");
const products = require("../Models/products");
const products_log = require("../Models/products_log");
const product_units = require("../Models/product_units");
const product_categories = require("../Models/product_categories");
const product_brands = require("../Models/product_brands");
const product_units_details = require("../Models/product_units_details");
const product_units_details_log = require("../Models/product_units_details_log");
const { environment } = require("../Global/environment");
const inventories = require("../Models/inventories");
const { default: mongoose } = require("mongoose");

const Environment = environment();

const UPLOAD =
  Environment === "PRODUCTION"
    ? process.env.PRODUCTION_UPLOAD
    : Environment === "TESTING"
    ? process.env.TESTING_UPLOAD
    : Environment === "DEVELOPMENT"
    ? process.env.DEVELOPMENT_UPLOAD
    : Environment === "LOCAL"
    ? process.env.LOCAL_UPLOAD
    : "";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const authorize = authorization(req);

    const dir = path.join(UPLOAD, "products", "products");
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png/;
  const extname = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedFileTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png)."));
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
}).single("image");
const add_file = (req) => {
  let image_path = req?.file
    ? path
        .join("/products/products", path.basename(req.file.path))
        .replace(/\\/g, "/")
    : "";
  return image_path;
};
const remove_file = (filePath, res) => {
  let image_path = path?.join(UPLOAD, filePath);

  if (filePath) {
    fs.unlink(image_path, (errors) => {
      if (errors) {
        console.log(errors?.message);
      }
    });
  }
};

const get_create_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const all_units = await product_units?.find({
        branch: authorize?.branch,
      });
      const all_brands = await product_brands?.find({
        branch: authorize?.branch,
      });
      const all_categories = await product_categories?.find({
        branch: authorize?.branch,
      });

      const data = {
        units: all_units,
        brands: all_brands,
        categories: all_categories,
      };

      success_200(res, "", data);
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const create_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      upload(req, res, async (errors) => {
        if (errors) {
          failed_400(res, errors?.message);
        } else {
          const {
            name,
            barcode,
            unit,
            category,
            brand,
            purchase_price,
            sale_price,
            stock,
            expiry,
            tax,
            type,
            details,
            status,
            branch,
          } = req?.body;

          if (!name) {
            incomplete_400(res);
          } else {
            const selected_product_name = await products.findOne({
              name: name,
              branch: branch ? branch : authorize?.branch,
            });

            if (selected_product_name) {
              remove_file(add_file(req), res);
              failed_400(res, "Product name exists");
            } else {
              const selected_product_barcode = await products.findOne({
                $and: [
                  { barcode: { $ne: "" } },
                  { barcode },
                  { branch: branch || authorize?.branch },
                ],
              });

              if (selected_product_barcode) {
                remove_file(add_file(req), res);
                failed_400(res, "Product barcode exists");
              } else {
                const product = new products({
                  image: add_file(req, res),
                  name: name,
                  barcode: barcode,
                  unit: checknull(unit),
                  category: checknull(category),
                  brand: checknull(brand),
                  purchase_price: purchase_price,
                  sale_price: sale_price,
                  stock: stock ? stock : 0,
                  expiry: expiry ? expiry : 0,
                  tax: tax ? tax : 0,
                  type: type ? type : 0,
                  stock: stock ? stock : 0,
                  status: status ? status : 0,
                  ref: authorize?.ref,
                  branch: branch ? branch : authorize?.branch,
                  created: new Date(),
                  created_by: authorize?.id,
                });

                const product_save = await product?.save();

                // product unit details creation
                const unit_details = JSON?.parse?.(details);

                if (unit_details?.length > 0) {
                  let total = unit_details?.length;
                  let count = 0;

                  for (value of unit_details) {
                    if (value?.name) {
                      const unit_detail = new product_units_details({
                        product: product_save?._id,
                        name: value?.name,
                        conversion: value?.conversion ? value?.conversion : 0,
                        status: status ? status : 0,
                        ref: authorize?.ref,
                        branch: branch ? branch : authorize?.branch,
                        created: new Date(),
                        created_by: authorize?.id,
                      });

                      const unit_detail_save = await unit_detail?.save();
                      count++;
                    } else {
                      count++;
                    }
                  }

                  if (total == count) {
                    success_200(res, "Product created");
                  } else {
                    failed_400(res, "Product units not created");
                  }
                } else {
                  success_200(res, "Product created");
                }
              }
            }
          }
        }
      });
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const update_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      upload(req, res, async (errors) => {
        if (errors) {
          failed_400(res, errors?.message);
        } else {
          const {
            id,
            name,
            barcode,
            unit,
            category,
            brand,
            purchase_price,
            sale_price,
            stock,
            expiry,
            tax,
            type,
            status,
            details,
            branch,
          } = req?.body;

          if (!id || !name) {
            incomplete_400(res);
          } else {
            const selected_product = await products?.findById(id);

            if (!selected_product || selected_product.status == 2) {
              remove_file(add_file(req), res);
              failed_400(res, "Product not found");
            } else {
              const selected_product_name = await products.findOne({
                _id: { $ne: id },
                name: name,
                branch: branch ? branch : authorize?.branch,
              });

              if (selected_product_name) {
                remove_file(add_file(req), res);
                failed_400(res, "Product name exists");
              } else {
                const selected_product_barcode = await products.findOne({
                  $and: [
                    { _id: { $ne: id } },
                    { barcode: { $ne: "" } },
                    { barcode },
                    { branch: branch || authorize?.branch },
                  ],
                });

                if (selected_product_barcode) {
                  remove_file(add_file(req), res);
                  failed_400(res, "Product barcode exists");
                } else {
                  const product_log = new products_log({
                    product: selected_product?._id,
                    image: selected_product?.image,
                    name: selected_product?.name,
                    barcode: selected_product?.barcode,
                    unit: selected_product?.unit,
                    category: selected_product?.category,
                    brand: selected_product?.brand,
                    purchase_price: selected_product?.purchase_price,
                    sale_price: selected_product?.sale_price,
                    stock: selected_product?.stock,
                    expiry: selected_product?.expiry,
                    tax: selected_product?.tax,
                    type: selected_product?.type,
                    status: selected_product?.status,
                    ref: selected_product?.ref,
                    branch: selected_product?.branch,
                    updated: new Date(),
                    updated_by: authorize?.id,
                  });
                  const product_log_save = await product_log?.save();

                  if (!req?.file && selected_product.image) {
                    remove_file(selected_product?.image, res);
                    selected_product.image = "";
                  } else if (req?.file && !selected_product.image) {
                    selected_product.image = add_file(req, res);
                  } else if (req?.file && selected_product.image) {
                    remove_file(selected_product?.image, res);
                    selected_product.image = add_file(req, res);
                  } else {
                    selected_product.image = "";
                  }

                  selected_product.name = name;
                  selected_product.barcode = barcode;
                  selected_product.unit = checknull(unit);
                  selected_product.category = checknull(category);
                  selected_product.brand = checknull(brand);
                  selected_product.purchase_price = purchase_price
                    ? purchase_price
                    : 0;
                  selected_product.sale_price = sale_price ? sale_price : 0;
                  selected_product.stock = stock ? stock : 0;
                  selected_product.expiry = expiry ? expiry : 0;
                  selected_product.tax = tax ? tax : 0;
                  selected_product.type = type ? type : 0;
                  selected_product.status = status ? status : 0;
                  selected_product.branch = branch ? branch : authorize?.branch;
                  selected_product.created = new Date();
                  selected_product.created_by = authorize?.id;

                  const product_update = await selected_product?.save();

                  // product unit details update
                  const selected_product_unit_details_delete =
                    await product_units_details?.deleteMany({
                      product: selected_product?._id,
                    });

                  const unit_details = JSON?.parse?.(details);

                  if (unit_details?.length > 0) {
                    let total = unit_details?.length;
                    let count = 0;

                    for (value of unit_details) {
                      if (value?.name) {
                        const unit_detail = new product_units_details({
                          product: product_update?._id,
                          name: value?.name,
                          conversion: value?.conversion ? value?.conversion : 0,
                          status: status ? status : 0,
                          ref: authorize?.ref,
                          branch: branch ? branch : authorize?.branch,
                          created: new Date(),
                          created_by: authorize?.id,
                        });

                        const unit_detail_save = await unit_detail?.save();
                        count++;
                      } else {
                        count++;
                      }
                    }

                    if (total == count) {
                      success_200(res, "Product updated");
                    } else {
                      failed_400(res, "Product units not created");
                    }
                  } else {
                    success_200(res, "Product updated");
                  }
                }
              }
            }
          }
        }
      });
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const delete_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product = await products.findById(id);

        if (!selected_product || selected_product.status == 2) {
          failed_400(res, "Product not found");
        } else {
          const product_log = new products_log({
            product: selected_product._id,
            image: selected_product.image,
            name: selected_product.name,
            barcode: selected_product.barcode,
            unit: selected_product.unit,
            category: selected_product.category,
            brand: selected_product.brand,
            purchase_price: selected_product?.purchase_price,
            sale_price: selected_product?.sale_price,
            stock: selected_product?.stock,
            expiry: selected_product?.expiry,
            tax: selected_product?.tax,
            type: selected_product?.type,
            status: selected_product?.status,
            ref: selected_product.ref,
            branch: selected_product.branch,
            updated: new Date(),
            updated_by: authorize?.id,
          });

          const product_log_save = await product_log.save();

          selected_product.status = 2;
          const product_delete = await selected_product.save();

          const selected_product_unit_details =
            await product_units_details?.find({
              product: selected_product?._id,
            });

          let count = 0;

          if (selected_product_unit_details?.length > 0) {
            for (value of selected_product_unit_details) {
              const product_unit_detail_log = new product_units_details_log({
                product_unit: value?._id,
                product: value?.product,
                name: value?.name,
                conversion: value?.conversion,
                status: value?.status,
                ref: value?.ref,
                branch: value?.branch,
                updated: new Date(),
                updated_by: authorize?.id,
              });

              const product_unit_detail_log_save =
                await product_unit_detail_log?.save();
              count++;
            }

            if (count == selected_product_unit_details?.length) {
              success_200(res, "Product updated");
            } else {
              failed_400(res, "Product delete failed");
            }
          } else {
            success_200(res, "Product deleted");
          }
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors.message);
  }
};

const get_product = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product = await products
          ?.findById(id)
          ?.populate({ path: "unit", match: { status: 1 } })
          ?.populate({ path: "category", match: { status: 1 } })
          ?.populate({ path: "brand", match: { status: 1 } });

        if (!selected_product || selected_product?.status == 2) {
          failed_400(res, "Product not found");
        } else {
          const product = selected_product?.toObject();
          const product_unit_details = await product_units_details
            ?.find({
              product: selected_product?._id,
            })
            ?.populate("name");

          success_200(res, "", {
            ...product,
            product_units_details: product_unit_details,
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

const get_all_products = async (req, res) => {
  try {
    const authorize = authorization(req);
    if (!authorize) {
      return unauthorized(res);
    }

    const { search, sort, unit, category, brand, type, status, page, limit } =
      req?.body;

    const page_number = Number(page) || 1;
    const page_limit = Number(limit) || 10;

    // Define the base filter for products
    const branchObjectId = new mongoose.Types.ObjectId(authorize?.branch);

    const productList = {
      branch: branchObjectId,
      status: { $ne: 2 },
    };

    if (search) {
      // Trim the search term to handle any leading/trailing spaces
      const searchTerm = search.trim().toLowerCase();

      productList.$or = [
        {
          name: {
            $regex: searchTerm,
            $options: "i", // Case-insensitive search for name
          },
        },
        {
          barcode: searchTerm, // Exact match for the barcode
        },
      ];
    }

    if (unit) productList.unit = new mongoose.Types.ObjectId(unit);
    if (category) productList.category = new mongoose.Types.ObjectId(category);
    if (brand) productList.brand = new mongoose.Types.ObjectId(brand);
    if (type != null) productList.type = type;
    if (status != null) productList.status = status;

    // Sort based on inventory or name
    const inventorySort =
      sort === 2
        ? { total_inventory: 1 } // Low to high
        : sort === 3
        ? { total_inventory: -1 } // High to low
        : { name: 1 }; // Default sort by name

    // Aggregation pipeline
    const pipeline = [
      { $match: productList },

      // Lookup inventories with status = 1
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "product",
          as: "product_inventories",
          pipeline: [{ $match: { status: 1 } }],
        },
      },

      // Total inventory calculation
      {
        $addFields: {
          total_inventory: {
            $sum: {
              $map: {
                input: "$product_inventories",
                as: "inventory",
                in: {
                  $cond: {
                    if: { $gt: [{ $ifNull: ["$$inventory.stock", 0] }, 0] },
                    then: "$$inventory.stock",
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },

      // Sort the data
      { $sort: inventorySort },

      // Pagination
      { $skip: (page_number - 1) * page_limit },
      { $limit: page_limit },

      // Lookup additional fields inline
      {
        $lookup: {
          from: "product_units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "product_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "product_brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      // Format lookup results (return single object instead of arrays)
      {
        $addFields: {
          unit: { $arrayElemAt: ["$unit", 0] },
          category: { $arrayElemAt: ["$category", 0] },
          brand: { $arrayElemAt: ["$brand", 0] },
        },
      },
    ];

    // Count total products (parallel query for performance)
    const totalCountPipeline = [{ $match: productList }, { $count: "total" }];

    const [results, totalCountResult] = await Promise.all([
      products.aggregate(pipeline).exec(),
      products.aggregate(totalCountPipeline).exec(),
    ]);

    const totalCount = totalCountResult[0]?.total || 0;

    // Send response
    success_200(res, "", {
      currentPage: page_number,
      totalPages: Math.ceil(totalCount / page_limit),
      totalCount,
      data: results,
    });
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_log = await products_log?.findById(id);

        if (!selected_product_log) {
          failed_400(res, "Product not found");
        } else {
          success_200(res, "", selected_product_log);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_all_products_log = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { product } = req?.body;

      if (!product) {
        incomplete_400(res);
      } else {
        const all_products_log = await products_log?.find({
          product: product,
        });
        success_200(res, "", all_products_log);
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_unit_detail = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { id } = req?.body;

      if (!id) {
        incomplete_400(res);
      } else {
        const selected_product_unit_detail = await product_units_details
          ?.findById(id)
          ?.populate("name");

        if (!selected_product_unit_detail) {
          failed_400(res, "Unit not found");
        } else {
          success_200(res, "", selected_product_unit_detail);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

const get_product_barcode = async (req, res) => {
  try {
    const authorize = authorization(req);

    if (authorize) {
      const { barcode } = req?.body;

      if (!barcode) {
        incomplete_400(res);
      } else {
        const selected_product = await products?.findOne({
          barcode: barcode,
          branch: authorize?.branch,
        });

        if (!selected_product || selected_product?.status == 2) {
          failed_400(res, "Product not found");
        } else {
          success_200(res, "", selected_product);
        }
      }
    } else {
      unauthorized(res);
    }
  } catch (errors) {
    catch_400(res, errors?.message);
  }
};

module.exports = {
  get_create_product,
  create_product,
  update_product,
  delete_product,
  get_product,
  get_all_products,
  get_product_log,
  get_all_products_log,
  get_product_unit_detail,
  get_product_barcode,
};
